import * as fs from "fs";
import { ExecException } from "node:child_process";

/**
 * Takes the ouput of a npm list -j -l process, uses it to determine the @aditosoftware dependencies of the project and creates
 * a jsconfig.json file that has the * path value in the compilerOptions set such that the libraries of the @aditosoftware dependencies can be resolved
 * 
 * @param pOutput this is the output the npm list -j -l process wrote to the console during its execution
 * @param pExitCode the exitcode that the npm command exited with, anything other than 0 here means the process encountered an error
 */
export function createJsConfigFile(pOutput: string, pError: ExecException | null, pStdErr: string, pTemplatePathFn: () => string): void
{
    if (pError !== null) 
    {
        console.log("npm list command failed due to " + `${pError.name}: ${pError.message}` + ".\nError output: " + pStdErr + "\nCannot create jsconfig");
        return;
    }

    const json: JsConfigJSON = transformTemplate(getJsConfigJSON(pTemplatePathFn), pOutput);

    // write to disk and use 4 spaces for formatting
    fs.writeFileSync('jsconfig.json', JSON.stringify(json, null, 4));
}

/**
 * Transform the JSON from the jsconfig.template.json to the JSON that should be used to write the acutal jsconfig.json
 * 
 * @param pTemplateJSON JSON of the jsconfig.template.json
 * @param pOutput output of the npm list -j -l command that is used to work out the currently used @aditosoftware dependencies
 * @returns JSON modified such that the compilerOptions.paths.* node is set to contain the existing third party dependencies from the template and all the properly formatted @aditosoftware dependencies
 */
export function transformTemplate(pTemplateJSON: JsConfigJSON, pOutput: string): JsConfigJSON 
{
    pTemplateJSON.compilerOptions ??= {};
    pTemplateJSON.compilerOptions.paths ??= {};
    // override the old value for the * rule pathExtensions
    pTemplateJSON.compilerOptions.paths['*'] = getPathExtensionsToSet(pTemplateJSON, pOutput);
    return pTemplateJSON;
}

/**
 * Calculate all @aditosoftware dependencies that have to be set as path extension in the jsconfig such that the JDito process files can be found and imports work as expected
 *  
 * @param pExistingJsConfigJSON JSON of the jsconfig.template.json to get all existing third party dependencies that are stored in the paths node
 * @param pOutput output of the npm list -j -l command that is used to work out the currently used @aditosoftware dependencies
 * @returns list of strings that have to be set as content of the compilerOptions.paths node in the jsconfig
 */
export function getPathExtensionsToSet(pExistingJsConfigJSON: JsConfigJSON, pOutput: string): string[]
{
    const aditoDependencies: string[] = parseAditoDependencies(pOutput);

    // first get all pathExtensions for the * rule that do not have the @aditosoftware tag. This is so that @aditosoftware dependencies, that are no longer in use, are removed
    let pathExtensions: string[] = getExistingThirdPartyDependencies(pExistingJsConfigJSON);

    // for all @aditosoftware dependencies gathered from the output of npm list we create the path for the * rule for each dependency and add it to the pathExtensions
    aditoDependencies.forEach(pDependency => pathExtensions.push(`node_modules/${pDependency}/process/*/process`));
    return pathExtensions;
}

/**
 * Tries to parse and return the jsconfig.template.json, if that file does not exist returns JSON of the default jsconfig template
 * 
 * @param pTemplatePathFn Function/Supplier that returns the path to the jsconfig.template.json
 * @returns JsConfigJSON object with the parsed json contents of the file, or the default jsconfig template
 */
export function getJsConfigJSON(pTemplatePathFn: () => string) : JsConfigJSON
{
    const templatePath: string = pTemplatePathFn();
    // json is either the contents of the jsConfig template file (if it exists) or the default template
    let json: JsConfigJSON;
    if(fs.existsSync(templatePath))
    {
        try
        {
            const fileContents: string = fs.readFileSync(templatePath, {encoding: "utf-8"});
            json = JSON.parse(fileContents);
        } catch
        {
            json = getDefaultConfigTemplate();
        }
    } else
    {
        json = getDefaultConfigTemplate();
    }
    return json;
}

/**
 * Get all dependencies that are not part of the @aditosoftware group and that are part of the compilerOptions -> paths -> * part of the JSON
 * 
 * @param pJsConfigJSON JSON content of the JsConfig
 * @returns all dependencies listed in the * paths of the compilerOptions that do not start with @aditosoftware , always returns a string array (might be empty though)
 */
export function getExistingThirdPartyDependencies(pJsConfigJSON: JsConfigJSON): string[]
{
    const paths = pJsConfigJSON.compilerOptions?.paths ?? {};
    const pathValues = paths['*'] ?? [];
    return pathValues.filter((pValue: String): boolean => !pValue.startsWith('@aditosoftware'));
}

/**
 * Collect all @aditosoftware dependencies in the process output
 * 
 * @param pOutput this is the output the npm list -j -l process wrote to the console during its execution
 * @returns an array containing all dependencies that start with @aditosoftware , always returns a string array (might be empty though)
 */
export function parseAditoDependencies(pOutput: string): string[] 
{
    let jsonObj: NpmListJSON = JSON.parse(pOutput);
    // use a Set as intermediary step to eliminate duplicate elements
    return Array.from(new Set(getAditoDependenciesRecursive(jsonObj)));
}

/**
 * Goes through all dependencies of the given JSON and extracts the dependencies with organization scope @aditosoftware
 * 
 * @param jsonOutput NpmListJSON object containing the dependencies
 * @returns all dependencies (including transitive dependencies) whose organization scope is @aditosoftware
 */
function getAditoDependenciesRecursive(jsonOutput: NpmListJSON): string[]
{
    let aditoDependencies = Object.keys(jsonOutput.dependencies ?? {})
    .filter(key => key.startsWith('@aditosoftware')) ?? [];
    return aditoDependencies.concat(aditoDependencies
        .flatMap(dependency => getAditoDependenciesRecursive(jsonOutput.dependencies?.[dependency] ?? {})));
}

/**
 * Describes the JSON structure of the JsConfig - or at the least the part of the structure we are interested in
 */
export interface JsConfigJSON {
    compilerOptions?: CompilerOptions;
}

/**
 * Describes the compilerOptions part of the JsConfig file. This interface only contains the parts we are interested in, there are other key-value pairs in the full structure as well
 */
export interface CompilerOptions {
    module?: string,
    target?: string,
    moduleResolution?: string,
    baseUrl?: string,
    checkJs?: boolean,
    noEmit?: boolean,
    removeComments?: boolean;
    strict?: boolean,
    paths?: {[key: string]: string[]}
}

/**
 * Describes the part of the JSON structure of the npm list -j -l output that we are interested in. There are many other key-value pairs in the full structure, but we are not interested in those
 */
export interface NpmListJSON {
    version: string,
    dependencies: Record<string, NpmListJSON>
}

/**
 * Provides the contents of a default jsconfig template
 * This function is exported to make comparisons to it in test cases easier
 * 
 * @returns JSON of the default jsconfig template
 */
export function getDefaultConfigTemplate(): JsConfigJSON 
{
  return {
    "compilerOptions": {
      "module": "es6",
      "moduleResolution": "node",
      "baseUrl": ".",
      "checkJs": true,
      "noEmit": true,
      "removeComments": true,
      "strict": false,
      "paths": {
        "*": ["process/*/process", "node_modules/*/process", "node_modules/@aditosoftware/*/process"],
        "@aditosoftware/jdito-types": ["node_modules/@aditosoftware/jdito-types/index"]
      }
    }
  };
}