const { createJsConfigFile } = require("../src/jsConfigUtil.js");
const { exec, ExecException } = require("node:child_process");

// the template jsconfig must be located in the root folder of the project, like the resulting jsconfig.json
const jsconfigTemplatePath: string = 'jsconfig.template.json'

// execute the npm list command and pass the output to the createJsConfigFile method to create the jsconfig.json file
exec("npm list -j -l", (pError: typeof ExecException | null, pStdOut: string, pStdErr: string) => createJsConfigFile(pStdOut, pError, pStdErr, () => jsconfigTemplatePath))
