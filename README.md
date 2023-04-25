# ADITO devtools

ADITO devtools offers tools that allows easier workflows and offer automated tasks for working with ADITO projects and JDito processes.

## Tools

A short overview over the tools that ADITO devtools contains

### Write JS Config

The file structure with the JDito processes in modularized processes does not work out of the box with jsconfigs. This tool enables you to create a working jsconfig.json from a jsconfig.template.json by analyzing the npm dependencies, collecting all ADITO dependencies and writing a matching paths section in the jsconfig.json. 

## Usage

### Write JS Config

1. Include this module in your package.json. If your project does not contain ts-node and typescript as dependencies, include those as well
```
    npm install -D @aditosoftware/devtools ts-node typescript
```
2. Rename your existing jsconfig.json to jsconfig.template.json. All contents of this jsconfig.template.json are passed to the final jsconfig.json that is created by the writeJsConfig script
3. Add the following to your package.json to automatically run the script on each npm install:
```
    "scripts": {
        "postinstall": "ts-node --esm ./node_modules/@aditosoftware/devtools/src/writeJsConfig.ts"
    }
```
4. Run ``` npm install ``` on your project