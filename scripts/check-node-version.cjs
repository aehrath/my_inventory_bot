const minimum = [22, 13, 0];
const current = process.versions.node.split(".").map(Number);

const supported =
  current[0] > minimum[0] ||
  (current[0] === minimum[0] &&
    (current[1] > minimum[1] ||
      (current[1] === minimum[1] && current[2] >= minimum[2])));

if (!supported) {
  console.error(`
InventoryBot requires Node.js 22.13.0 or newer.
This terminal is running Node.js ${process.versions.node}.

Laravel Herd:
  herd isolate-node 22

nvm:
  nvm install 22
  nvm use

Then run npm run dev again.
`);
  process.exit(1);
}
