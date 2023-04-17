import { getExistingThirdPartyDependencies, JsConfigJSON, parseAditoDependencies, getDefaultConfigTemplate, getJsConfigJSON, transformTemplate } from "../src/jsConfigUtil.js";
import * as assert from "node:assert";
import * as fs from "fs";

/*
 * Test cases for the getExistingThirdPartyDependencies function
 */
describe("GetExistingThirdPartyDependencies Tests", () => {
    it("Should return nothing on emtpy JSON", () => {
        const dependencies: string[] = getExistingThirdPartyDependencies({});
        assert.equal([].toString(), dependencies.toString());
    }),
    /**
     * If there are no paths declared, there are no third party dependencies
     */
    it("Should return nothing", () => {
        const dependencies: string[] = getExistingThirdPartyDependencies({compilerOptions: {paths: {}}});
        assert.equal([].toString(), dependencies.toString());
    }),
    /**
     * If there is a path of a single third party dependency specified, that path should be returned
     */
    it("Should return the test dependency when only that dependency exists", () => {
        const dependencies: string[] = getExistingThirdPartyDependencies({compilerOptions: {paths: {"*": ["test"]}}});
        assert.equal(["test"].toString(), dependencies.toString());
    }),
    /**
     * If there are multiple adito dependencies and a single third party dependency, only that third party dependency should be returned
     */
    it("Should return the third party dependency when several dependencies exist", () => {
        const dependencies: string[] = getExistingThirdPartyDependencies({compilerOptions: {paths: {"*": ["test", "@aditosoftware/util", "@aditosoftware/foo"]}}});
        assert.equal(["test"].toString(), dependencies.toString());
    }),
    /**
     * If there are multiple adito and third party dependencies, all third party dependencies should be returned
     */
    it("Should return the third party dependencies when several dependencies exist", () => {
        const dependencies: string[] = getExistingThirdPartyDependencies({compilerOptions: {paths: {"*": ["test", "@aditosoftware/util", "@aditosoftware/foo", "bar"]}}});
        assert.equal(["test", "bar"].toString(), dependencies.toString());
    })
})

/*
 * Test cases for the parseAditoDependencies function
 */
describe("ParseAditoDependencies Tests", () => {
    /**
     * If the JSON is empty, no dependencies should be found
     */
    it("Should return nothing on empty object", () => {
        const dependencies: string[] = parseAditoDependencies(JSON.stringify({}));
        assert.equal([].toString(), dependencies.toString());
    }),
    /**
     * If the dependencies part of the JSON is empty, no dependencies should be found
     */
    it("Should return nothing on empty dependencies", () => {
        const dependencies: string[] = parseAditoDependencies(JSON.stringify({dependencies: {}}));
        assert.equal([].toString(), dependencies.toString());
    }),
    /**
     * If there are only third party dependencies in the JSON, no ADITO dependencies should be found
     */
    it("Should return nothing on only third-party dependencies", () => {
        const dependencies: string[] = parseAditoDependencies(JSON.stringify({dependencies: {"test": []}}));
        assert.equal([].toString(), dependencies.toString());
    }),
    /**
     * If there is a single ADITO dependency in the JSON, only that dependency should be returned
     */
    it("Should return the single adito dependency", () => {
        const dependencies: string[] = parseAditoDependencies(JSON.stringify({dependencies: {"test": [], "@aditosoftware/util": []}}));
        assert.equal(["@aditosoftware/util"].toString(), dependencies.toString());
    }),
    /**
     * If there are several ADITO dependencies in the JSON, all of them but no more should be returned
     */
    it("Should return the all adito dependencies", () => {
        const dependencies: string[] = parseAditoDependencies(JSON.stringify({dependencies: {"test": [], "@aditosoftware/util": [], "@aditosoftware/root": []}}));
        assert.equal(["@aditosoftware/util", "@aditosoftware/root"].toString(), dependencies.toString());
    }),
    /**
     * If there is no dependencies node in the JSON, no dependencies should be returned
     */
    it("Should return no dependencies when dependencies node is missing", () => {
        const dependencies: string[] = parseAditoDependencies(JSON.stringify({someOtherNode: {"test": [], "@aditosoftware/util": [], "@aditosoftware/root": []}}));
        assert.equal([].toString(), dependencies.toString());
    }),
    /**
     * If an invalid JSON is provided, the return should be no dependencies but there should not be an exception
     */
    it("Should return no dependencies ony invalid JSON", () => {
        const dependencies: string[] = parseAditoDependencies("4");
        assert.equal([].toString(), dependencies.toString());
    })
})

/*
 * Test cases for the getJsConfigJSON function
 */
describe("GetJsConfigJSON Tests", () => {
    /**
     * If there is no JsConfig.template.json, the default template JSON should be used
     */
    it("Should return the default template on non-existing file", () => {
        const configJSON: JsConfigJSON = getJsConfigJSON(() => "nonExistingFile.json");
        assert.equal(getDefaultConfigTemplate().toString(),configJSON.toString());
        assert.equal(typeof configJSON.compilerOptions?.target, "undefined");
    }),
    /**
     * If an jsConfig.template.json exists, it should be properly read
     */
    it("Should read provided jsconfig.template.json correctly", () => {
        const filePath = "test/resources/jsconfig.template.json"
        assert.ok(fs.existsSync(filePath))
        const configJSON: JsConfigJSON = getJsConfigJSON(() => filePath);
        // read a condition that is different to the default template
        assert.equal(configJSON.compilerOptions?.target, "es6");
    }),
    /**
     * if the provided jsConfig.template.json is invalid, the default template should be used
     */
    it("Should return the default template when provided with a malformed jsconfig", () => {
        const filePath = "test/resources/jsconfigError.template.json";
        assert.ok(fs.existsSync(filePath))
        const configJSON: JsConfigJSON = getJsConfigJSON(() => filePath);
        assert.equal(getDefaultConfigTemplate().toString(), configJSON.toString());
        // try a node that does not exist in the default template
        assert.equal(typeof configJSON.compilerOptions?.target, "undefined");
    })
})

/*
 * Test cases for the transformTemplate function
 */
describe("TransformTemplate Tests", () => {
    /**
     * the functions should be able to deal with two empty JSONs as parameters
     */
    it("Should return empty JSON if neither template has any info nor are there any dependencies", () => {
        const jsconfig: JsConfigJSON = transformTemplate({}, JSON.stringify({}))
        assert.equal({}.toString(), jsconfig.compilerOptions?.paths)
    }),
    /**
     * If the template JSON is empty, the function should still be able to apply the dependencies from the output and create a valid JSON object
     */
    it("Should apply dependencies even if the template JSON is empty", () => {
        const jsconfig: JsConfigJSON = transformTemplate({}, JSON.stringify({someOtherNode: {"test": [], "@aditosoftware/util": [], "@aditosoftware/root": []}}))
        assert.equal({"*": ["node_modules/@aditosoftware/util/process/*/process", "node_modules/@aditosoftware/root/process/*/process"]}.toString(),
            jsconfig.compilerOptions?.paths)
    }),
    /**
     * If there are no dependencies, the function should not change the default template JSON is gets passed
     */
    it("Should not change the template JSON if there are no dependencies", () => {
        const jsconfig: JsConfigJSON = transformTemplate(getDefaultConfigTemplate(), JSON.stringify({}))
        assert.equal(getDefaultConfigTemplate().toString(), jsconfig.toString())
    })
})