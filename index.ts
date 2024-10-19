import chokidar from 'chokidar';
import fs from 'fs/promises';
import path from 'path';
import sharp, { WebpOptions } from 'sharp';
import type { Plugin } from 'vite';


export const vitePluginWebp = (cwd: string = './public'): Plugin => {
  return {
    name: 'vite-plugin-webp',
    config: (_, {command, mode}) => {
      if(command === 'serve' && mode === 'development') {
        watch(cwd)
      }
      return {}
    }
  };
}

function isImageFile(fileName: string) {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg'];
  return imageExtensions.includes(path.extname(fileName).toLowerCase());
}


const watch = async(cwd: string, webpOptions?: WebpOptions) => {


  const watcher = chokidar.watch('.', {
    ignored: ['.node_modules'],
    persistent: true,
    ignoreInitial: true,
    cwd
  });

  watcher.on('add', (filePath) => {
    createWebp(path.join(cwd, filePath), webpOptions)
  }) 


watcher.on('ready', async () => {
  const images = await listImageDirectories(cwd)
  const imgs = new Set()
  images.forEach(image => {
    if(image.endsWith('.webp')) return
    const dir = image.replace(path.extname(image), '')
    const webp = dir+'.webp'

    if(images.includes(webp)) return
    imgs.add(image)
  })

  for (const image of imgs) {
    if(!image) return
    createWebp(image as string, webpOptions)
  }

})


}

async function createWebp (filePath: string, webpOptions?: WebpOptions) {
  const fileName = filePath
  const outputFileName = path.basename(filePath).replace(path.extname(filePath), '.webp')
  const p = path.dirname(fileName)

  if(!isImageFile(fileName)) return
  try {
    await sharp(fileName).webp({
        quality: 80,
        effort:6,
        alphaQuality: 80,
        ...webpOptions
      }).toFile(path.resolve(p, outputFileName))
  } catch (error) {
    // console.log(error)
  }

}


async function listImageDirectories(publicPath: string): Promise<string[]> {
  const imageDirectories: Set<string> = new Set();
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

  async function scanDirectory(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await scanDirectory(fullPath);
      } else if (entry.isFile() && imageExtensions.includes(path.extname(entry.name).toLowerCase())) {
        imageDirectories.add(fullPath);
      }
    }
  }

  await scanDirectory(publicPath);
  return Array.from(imageDirectories);
}

