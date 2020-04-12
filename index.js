import { getOptions } from 'loader-utils';
import validateOptions from 'schema-utils';

function loader(src) {
    const options = getOptions(this);
    validateOptions(schema, options, {
        name: 'Test Loader',
        baseDataPath: 'options',
    });
    console.log(JSON.stringify(this), '------------');
    console.log(options, 'options');
    console.log(src, 'srcsrcsrcsrc');
}

exports.default = loader;
