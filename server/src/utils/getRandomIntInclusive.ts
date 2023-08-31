function getRandomIntInclusive(max: number) {
    max = Math.floor(max);
    return Math.floor(Math.random() * (max + 1)); // The maximum is inclusive and the minimum is inclusive
}

export default getRandomIntInclusive;
