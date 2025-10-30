const promise = new Promise(async (resolve) => {
    await new Promise((res) => setTimeout(res, 1000));
    resolve();
    console.log('inner');
});

promise.then(() => {
    console.log('outer');
});
