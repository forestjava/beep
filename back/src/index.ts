import { HarmonicEntityPlayer } from "./HarmonicEntityPlayer";
import { Life } from "./Life";

const player = new HarmonicEntityPlayer();
const lifecycle = new Life(player);
lifecycle.start();

function shutdown(): void {
  console.log("\nSIGINT: shutting down audio…");
  lifecycle.stop();
  player.shutdown()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

process.once("SIGINT", shutdown);
process.once("SIGBREAK", shutdown);
