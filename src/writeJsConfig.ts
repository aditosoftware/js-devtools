import * as fs from "fs";
import { spawn } from "node:child_process";

const jsconfigTemplatePath: string = '../jsconfig.template.json'

run_script("npm", ["list", "-j", "-l"], (pCommand: string, pExitCode: number) => createJsConfigFile(pCommand, pExitCode, () => {return jsconfigTemplatePath}));

/**
 * Takes the ouput of a npm list -j -l process, uses it to determine the @aditosoftware dependencies of the project and creates
 * a jsconfig.json file that has the * path value in the compilerOptions set such that the libraries of the @aditosoftware dependencies can be resolved
 * 
 * @param pOutput this is the output the npm list -j -l process wrote to the console during its execution
 * @param pExitCode the exitcode that the npm command exited with, anything other than 0 here means the process encountered an error
 */
export function createJsConfigFile(pOutput: string, pExitCode: number, pTemplatePathFn: () => string): void
{
    if (pExitCode != 0) 
    {
        console.log("npm list command failed with exit code " + pExitCode + ", cannot create jsconfig");
        return;
    }

    const json: JsConfigJSON = getJsConfigJSON(pTemplatePathFn);
    
    // override the old value for the * rule pathExtensions
    json.compilerOptions.paths['*'] = getPathExtensionsToSet(json, pOutput);

    // write to disk and use 4 spaces for formatting
    fs.writeFileSync('jsconfig.json', JSON.stringify(json, null, 4));
}

/**
 * 
 * @param pExistingJsConfigJSON 
 * @param pOutput 
 * @returns 
 */
export function getPathExtensionsToSet(pExistingJsConfigJSON: JsConfigJSON, pOutput: string): string[]
{
    const aditoDependencies: string[] = parseAditoDependencies(pOutput);

    // first get all pathExtensions for the * rule that do not have the @aditosoftware tag. This is so that @aditosoftware dependencies, that are no longer in use, are removed
    let pathExtensions: string[] = getExistingThirdPartyDependencies(pExistingJsConfigJSON);

    // for all @aditosoftware dependencies gathered from the output of npm list we create the path for the * rule for each dependency and add it to the pathExtensions
    aditoDependencies.forEach((pDependency: string): number => pathExtensions.push('node_modules/' + pDependency + '/process/*/process'));
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
            const fileContents: string = fs.readFileSync(templatePath, {"encoding": "utf-8"});
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
    let pathValues: string[] = pJsConfigJSON.compilerOptions.paths['*'];
    if(typeof pathValues === "undefined")
    {
        pathValues = new Array();
    }
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
    const aditoDependencies: string[] = new Array();

    let jsonObj: NpmListJSON = JSON.parse(pOutput);
    for (let key in jsonObj.dependencies) 
    {
        if(key.startsWith('@aditosoftware')) 
        {
            aditoDependencies.push(key);
        }
    }

    return aditoDependencies;
}

/**
 * Runs a given process with the provided arguments, waits for the process to finish its execution and then calls the callback with the output of the process and the exit code
 * 
 * @param command process to execute
 * @param args arguments to pass to the process
 * @param callback function to be executed on completion of the process. Has the console output of the process as first parameter, and the exit code as second parameter
 */
function run_script(command: string, args: string[], callback: (pParam1: string, pExitCode: number) => void): void
{
    var child = spawn(command, args);

    // used to collect the console output of the process
    var scriptOutput: string = "";

    // log the errors to console, to make searching for errors/problems easier
    child.on("error", function(data: string)
    {
        console.log("error: " + data);
    });

    // add normal data output by the process to the variable tracking the script output
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", function(data: string) 
    {
        scriptOutput += data;
    });

    // add data of the error stream output of the process to the variable tracking the script output
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", function(data: string) 
    {
        // log the errors to console, to making identifying what went wrong easier
        console.log("error: " + data);
        scriptOutput += data;
    });

    // call the callback function when the process is terminated
    child.on("close", function(code: any) 
    {
        callback(scriptOutput, code);
    });
}

/**
 * Describes the JSON structure of the JsConfig - or at the least the part of the structure we are interested in
 */
export interface JsConfigJSON {
    compilerOptions: CompilerOptions;
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
    paths: {[key: string]: string[]}
}

/**
 * Describes the part of the JSON structure of the npm list -j -l output that we are interested in. There are many other key-value pairs in the full structure, but we are not interested in those
 */
export interface NpmListJSON {
    dependencies: {[key: string]: object}
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