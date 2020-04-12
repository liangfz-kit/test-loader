const loaderUtils = require('loader-utils');
const validateOptions = require('schema-utils');

function loader(src) {
    const options = loaderUtils.getOptions(this);
    validateOptions(schema, options, {
        name: 'Test Loader',
        baseDataPath: 'options',
    });
    console.log(JSON.stringify(this), '------------');
    console.log(options, 'options');
    console.log(src, 'srcsrcsrcsrc');
}

exports.default = loader;
