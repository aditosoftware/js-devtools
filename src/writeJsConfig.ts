import { createJsConfigFile } from "../src/jsConfigUtil.js";
import { exec } from "node:child_process";

// the template jsconfig must be located in the root folder of the project, like the resulting jsconfig.json
const jsconfigTemplatePath: string = 'jsconfig.template.json'

// execute the npm list command and pass the output to the createJsConfigFile method to create the jsconfig.json file
exec("npm list -j -l", (pError, pStdOut, pStdErr) => createJsConfigFile(pStdOut, pError, pStdErr, () => jsconfigTemplatePath))
