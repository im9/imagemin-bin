'use strict'

import imagemin from 'imagemin'
import imageminJpegtran from 'imagemin-jpegtran'
import imageminPngquant from 'imagemin-pngquant'
import imageminSvgo from 'imagemin-svgo'
import { spawn, exec } from 'child_process'
import fs from 'fs'
import path from 'path'

/**
 * targetImages
 * 圧縮対象の画像パスを取得する
 */
const targetImages = dir => {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(dirent => {
    return (dirent.isFile()) ? [`${dir}/${dirent.name}`] : targetImages(`${dir}/${dirent.name}`)
  })
}

/**
 * imageCompression
 * 対象の画像を圧縮する
 */
const imageCompression = async (filePath, tmpDir) => {
  await imagemin([filePath], {
    destination: `${tmpDir}/${path.dirname(filePath)}`,
    plugins: [
      imageminJpegtran(),
      imageminPngquant({
        quality: [0.6, 0.8],
      }),
      imageminSvgo(),
    ],
  })
}

/**
 * du
 * ファイルサイズを出力する
 */
 const du = async (path, prefix) => {
  const size = spawn('du', ['-sh', path])
  return size.stdout.on('data', data => console.log(`${prefix} size: ${data}`))
}

/**
 * argv
 * コマンドライン引数を取得する
 */
const argv = (() => {
  const arg = {}
  process.argv.slice(2).map(element => {
    const matches = element.match( '--([a-zA-Z0-9]+)=(.*)')
      if (matches) arg[matches[1]] = matches[2].replace(/^['"]/, '').replace(/['"]$/, '')
  })
  return arg
})();


(async () => {
  // tmp=圧縮ファイルの一時保存先 target=圧縮対象フォルダ dest=保存先フォルダ
  let { tmp, target, dest } = argv

  if (!tmp) tmp = 'tmp'

  fs.rmdirSync(`${tmp}${target}`, { recursive: true })

  du(target, 'Before')

  const targets = targetImages(target)

  await Promise.all([...targets.map(filePath => imageCompression(filePath, tmp, target))])

  exec(`cp -rf ${tmp}/${target} ${dest}`, () => {
    fs.rmdirSync(tmp, { recursive: true })
    du(target, 'After')
  })
})()
