// Generate a Kraken API nonce
const timestamp = Date.now();
const counter = Math.floor(Math.random() * 1000000);
const random = Math.floor(Math.random() * 1000);

const nonce = `${timestamp}${counter.toString().padStart(6, '0')}${random.toString().padStart(3, '0')}`;

console.log('Generated nonce:', nonce);
console.log('Use this as your nonce value');
