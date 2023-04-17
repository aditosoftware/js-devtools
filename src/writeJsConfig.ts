import { createJsConfigFile } from "../src/jsConfigUtil.js";
import { exec } from "node:child_process";

const jsconfigTemplatePath: string = '../jsconfig.template.json'

exec("npm list -j -l", (pError, pStdOut, pStdErr) => createJsConfigFile(pStdOut, pError, pStdErr, () => jsconfigTemplatePath))
