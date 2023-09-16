import path from "path";
import fs from "fs/promises";
import { generateImages } from "pwa-asset-generator";
import { type CLIOptions } from "pwa-asset-generator/dist/models/options";

const splashBasePath = path.join(__dirname, "/public/pwa-splash-base.png");
const iconBasePath = path.join(__dirname, "/public/pwa-icon-base.png");
const publicDirPath = path.join(__dirname, "/public");

const commonOptions: CLIOptions = {
    path: "",
    pathOverride: "",
    manifest: path.join(__dirname, "manifest.json"),
    index: path.join(__dirname, "index.html"),
    type: "png",
};

const darkBackground: CLIOptions = {
    background: "rgb(18, 18, 18)",
};

void (async () => {
    // light mode ios splash screens
    await generateImages(splashBasePath, publicDirPath, {
        ...commonOptions,
        splashOnly: true,
    });
    // dark mode ios splash screens
    await generateImages(splashBasePath, publicDirPath, {
        ...commonOptions,
        ...darkBackground,
        darkMode: true,
        splashOnly: true,
    });
    // transparent favicon
    await generateImages(iconBasePath, publicDirPath, {
        ...commonOptions,
        opaque: false,
        iconOnly: true,
        favicon: true,
    });
    // opaque app icons
    await generateImages(iconBasePath, publicDirPath, {
        ...commonOptions,
        ...darkBackground,
        iconOnly: true,
    });

    const manifestJsonPath = path.join(__dirname, "/manifest.json");
    const manifestJsonContent = String(await fs.readFile(manifestJsonPath));
    await fs.writeFile(
        manifestJsonPath,
        JSON.stringify(JSON.parse(manifestJsonContent), null, 4),
    );
})();
