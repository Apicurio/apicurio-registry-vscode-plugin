function isObject(value: unknown): value is object {
    return value instanceof Object && value.constructor === Object;
}

export { isObject };
