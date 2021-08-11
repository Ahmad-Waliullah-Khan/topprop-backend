const sleep = async function sleepHelper(delay: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, delay);
 });
}

module.exports = sleep;
