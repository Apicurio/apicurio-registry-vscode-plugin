function isObject(value: unknown): value is object {
    return value instanceof Object && value.constructor === Object;
}

function isString(value: unknown): value is string {
    return typeof value === 'string';
}

export { isObject, isString };
