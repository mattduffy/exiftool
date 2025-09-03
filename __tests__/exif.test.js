/**
 * @module @mattduffy/exiftool
 * @author Matthew Duffy <mattduffy@gmail.com>
 * @summary  A Jest test suite testing the methods of the Exiftool class.
 * @file __tests__/exif.test.js
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  copyFile,
  mkdir,
  rm,
  stat,
} from 'node:fs/promises'
import Debug from 'debug'
/* eslint-disable import/extensions */
import { Exiftool } from '../src/index.js'
import { path as executable } from '../src/which.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
Debug.log = console.log.bind(console)
const debug = Debug('exiftool:Test')
const error = debug.extend('ERROR')
debug(`exif path: ${executable}`)
debug(Exiftool)

// Set the items to be used for all the tests here as constants.

const testsDir = __dirname
const imageDir = `${__dirname}/images`
const image1 = `${imageDir}/copper.jpg`
const image2 = `${imageDir}/IMG_1820.jpg`
const image3 = `${imageDir}/IMG_1820.heic`
const image4 = `${imageDir}/strip.jpg`
const image5 = `${imageDir}/nemo.jpeg`
const image6 = `${imageDir}/nullisland.jpeg`
// const image7 = `${imageDir}/IPTC-PhotometadataRef-Std2021.1.jpg`
const image8 = `${imageDir}/Murph_mild_haze.jpg`
const image9 = `${imageDir}/needs-a-thumbnail.jpg`
const thumbnail = `${imageDir}/thumbnail.jpg`
const spacey = 'SNAPCHAT MEMORIES'
const spaceyPath = `${__dirname}/${spacey}/Murph_mild_haze.jpg`
const RealShortcut = 'BasicShortcut'
const FakeShortcut = 'FakeShortcut'
const NewShortcut = 'MattsNewCut'
const MattsNewCut = "MattsNewCut => ['exif:createdate', 'file:FileName']"

debug(`testsDir: ${testsDir}`)
debug(`imageDir: ${imageDir}`)
debug(`image1: ${image1}`)
debug(`image2: ${image2}`)
debug(`image3: ${image3}`)
debug(`image4: ${image4}`)

/* eslint-disable no-undef */
beforeAll(async () => {
  const log = debug.extend('before-all')
  const err = error.extend('before-all')
  try {
    const spaceyDirPath = path.resolve(__dirname, spacey)
    log(`Creating test path with spaces: ${spaceyDirPath}`)
    await mkdir(spaceyDirPath, { recursive: true })
    log(`${spaceyDirPath} exists? ${(await stat(spaceyDirPath)).isDirectory()}`)
    const spaceyDirPathFile = path.resolve(spaceyDirPath, 'Murph_mild_haze.jpg')
    log(spaceyDirPathFile)
    await copyFile(image8, spaceyDirPathFile)
    const spaceyConfigPath = path.resolve(__dirname, 'setConfigPathTest', spacey)
    log(spaceyConfigPath)
    await mkdir(spaceyConfigPath, { recursive: true })
    const src = path.resolve(__dirname, 'setConfigPathTest', 'exiftool.config')
    const dest = path.resolve(spaceyConfigPath, 'exiftool.config')
    log(`copy ${src} -> ${dest}`)
    await copyFile(src, dest)
  } catch (e) {
    err(e)
  }
})

afterAll(async () => {
  const log = debug.extend('after-all')
  const err = error.extend('after-all')
  const dir = __dirname.split('/')
  const file = `${dir.slice(0, dir.length - 1).join('/')}/exiftool.config`
  log(dir)
  try {
    await rm(`${file}.bk`)
  } catch (e) {
    err(e)
  }
  try {
    await rm(`${file}.test`)
  } catch (e) {
    err(e)
  }
  try {
    await rm(
      path.resolve(__dirname, 'setConfigPathTest', spacey),
      { recursive: true, force: true },
    )
  } catch (e) {
    err(e)
  }
  try {
    await rm(path.resolve(__dirname, spacey), { recursive: true, force: true })
  } catch (e) {
    err(e)
  }
})

describe('Exiftool metadata extractor', () => {
  test('it should be an instance of Exiftool', () => {
    expect(new Exiftool()).toBeInstanceOf(Exiftool)
  })

  test('setExtensionsToExclude: update array of file type extensions to exclude', async () => {
    const log = debug.extend('test-01-setExtensionsToExclude')
    let img = new Exiftool()
    const extensionsArray = img.getExtensionsToExclude()
    extensionsArray.push('CONFIG')
    log(extensionsArray)
    img.setExtensionsToExclude(extensionsArray)
    img = await img.init(image1)
    const excludes = img._opts.excludeTypes
    expect(excludes).toMatch(/CONFIG/)
  })

  test('init: should fail without a path arguement', async () => {
    const log = debug.extend('test-02-init-should-fail')
    let img = new Exiftool()
    log('no init arguments passed')
    expect(img = await img.init()).toBeFalsy()
  })

  test('init: with a path should return a configured exiftool', async () => {
    const log = debug.extend('test-03-init-pass')
    expect.assertions(2)
    let img = new Exiftool()
    img = await img.init(image1)
    log(`init argument: ${image1}`)
    expect(img._isDirectory).toBeDefined()
    expect(img).toHaveProperty('_fileStats')
  })

  test('which: exiftool is accessible in the path', async () => {
    const log = debug.extend('test-04-which')
    const img = new Exiftool()
    const exif = await img.which()
    log(exif)
    expect(exif).toMatch(/exiftool/)
  })

  test(
    'get/setConfigPath: change the file system path to the exiftool.config file',
    async () => {
      const log = debug.extend('test-05-get/setConfigPath')
      expect.assertions(4)
      const img = new Exiftool()
      // setConfigPathTest/exiftool.config
      const newConfigFile = `${__dirname}/setConfigPathTest/exiftool.config`
      log(newConfigFile)
      const oldConfigFile = img.getConfigPath()
      expect(oldConfigFile.value).toMatch(/exiftool\/src\/exiftool.config$/)

      const result = await img.setConfigPath(newConfigFile)
      expect(result.value).toBeTruthy()
      expect(img._command).toMatch(/setConfigPathTest/)

      // test a bad file path
      // setConfigPathTest/bad/exiftool.config
      const badConfigFile = `${__dirname}/setConfigPathTest/bad/exiftool.config`
      const badResult = await img.setConfigPath(badConfigFile)
      expect(badResult.e.code).toMatch(/ENOENT/)
    },
  )

  test('setPath: is the path to file or directory', async () => {
    const log = debug.extend('test-06-setPath')
    expect.assertions(5)
    const img = new Exiftool()
    // missing path value
    const result1 = await img.setPath()
    expect(result1.value).toBeNull()
    expect(result1.error).toBe('A path to image or directory is required.')
    const result2 = await img.setPath(image1)
    expect(result2.value).toBeTruthy()
    expect(result2.error).toBeNull()

    /* Relative paths are now acceptable  */
    // test with a relative path to generate an error
    try {
      const img1 = new Exiftool()
      const newPath = '__tests__/images/copper.jpg'
      const result3 = await img1.setPath(newPath)
      log(await img1.getPath())
      log(result3)
      expect(result3.error).toBeNull()
    } catch (e) {
      expect(e).toBeInstanceOf(Error)
    }
  })

  test('hasExiftoolConfigFile: check if exiftool.config file is present', async () => {
    const log = debug.extend('test-07-hasExiftoolConfigFile')
    expect.assertions(2)
    const img1 = new Exiftool()
    log('hasExiftoolConfigFile check - good check')
    expect(await img1.hasExiftoolConfigFile()).toBeTruthy()

    const img2 = new Exiftool()
    img2._exiftool_config = `${img2._cwd}/exiftool.config.missing`
    log('hasExiftoolConfigFile check - bad check')
    expect(await img2.hasExiftoolConfigFile()).toBeFalsy()
  })

  test('createExiftoolConfigFile: can create new exiftool.config file', async () => {
    const log = debug.extend('test-08-createExiftoolConfigFile')
    expect.assertions(2)
    let img = new Exiftool()
    img = await img.init(testsDir)
    img._exiftool_config = `${img._cwd}/exiftool.config.test`
    const result = await img.createExiftoolConfigFile()
    log(img.getConfigPath())
    expect(result.value).toBeTruthy()
    expect(img.hasExiftoolConfigFile()).toBeTruthy()
  })

  test('hasShortcut: check exiftool.config for a shortcut', async () => {
    const log = debug.extend('test-09-hasShortcut')
    expect.assertions(2)
    const img = new Exiftool()
    const result1 = await img.hasShortcut(RealShortcut)
    log(result1)
    expect(result1).toBeTruthy()
    const result2 = await img.hasShortcut(FakeShortcut)
    expect(result2).toBeFalsy()
  })

  test('addShortcut: add a new shortcut to the exiftool.config file', async () => {
    const log = debug.extend('test-10-addShortcut')
    expect.assertions(4)
    const img1 = new Exiftool()
    const result1 = await img1.addShortcut(MattsNewCut)
    log(result1)
    expect(result1.value).toBeTruthy()
    expect(result1.error).toBeNull()

    // check if new shortcut exists and can be returned
    let img2 = new Exiftool()
    img2 = await img2.init(image1)
    const result2 = await img2.hasShortcut(NewShortcut)
    expect(result2).toBeTruthy()

    // get metadata using new shortcut
    img2.setShortcut(NewShortcut)
    log(img2._command)
    const metadata = await img2.getMetadata()
    log(metadata)
    expect(metadata).not.toBeNull()
  })

  test('removeShortcut: remove a given shortcut from the exiftool.config file', async () => {
    const log = debug.extend('test-11-removeShortcut')
    const img1 = new Exiftool()
    const result1 = await img1.removeShortcut(NewShortcut)
    log(result1)
    expect(result1.value).toBeTruthy()
  })

  test('getMetadata: specify tag list as an optional parameter', async () => {
    const log = debug.extend('test-12-getMetadata-specify-tags')
    expect.assertions(3)
    // test adding additional tags to the command
    let img1 = new Exiftool()
    // init with the copper.jpg image1
    img1 = await img1.init(image1)
    const result1 = await img1.getMetadata(
      '',
      '',
      ['file:FileSize', 'file:DateTimeOriginal', 'file:Model'],
    )
    const count = parseInt(result1.slice(-1)[0], 10)
    log(count)
    expect(count).toBe(1)
    expect(result1[0]).toHaveProperty('File:FileSize')
    expect(result1[0]).toHaveProperty('EXIF:ImageDescription')
  })

  test('getMetadata: specify new file name and tag list as an optional parameter', async () => {
    const log = debug.extend('test-13-getMetadata-new-file')
    // test changing the file from one set in init()
    expect.assertions(2)
    let img2 = new Exiftool()
    // init with copper.jpg image1
    img2 = await img2.init(image1)
    // replace image1 with IMG_1820.jpg
    const result2 = await img2.getMetadata(
      image2,
      '',
      ['file:FileSize', 'file:DateTimeOriginal', 'file:ImageSize'],
    )
    log(result2[0])
    expect(result2[0]).toHaveProperty('File:FileSize')
    expect(result2[0]).toHaveProperty('Composite:GPSPosition')
  })

  test(
    'getMetadata: specify new shortcut name and tag list as an optional parameter',
    async () => {
      const log = debug.extend('test-14-getMetadata-new-shortcut')
      // test passing a new shortcut name
      let img3 = new Exiftool()
      // image3 is IMG_1820.heic
      img3 = await img3.init(image3)
      const result3 = await img3.getMetadata(
        '',
        NewShortcut,
        ['file:FileSize', 'file:ImageSize'],
      )
      log(result3[0]['file:FileSize'])
      expect(result3[0]).toHaveProperty('SourceFile')
    },
  )

  test('getMetadata: catch the forbidden -all= data stripping tag', async () => {
    const log = debug.extend('test-15-getMetadata-catch-forbidden-tag')
    // test catching the -all= stripping tag in get request
    let img4 = new Exiftool()
    // init with the copper.jpg image1
    img4 = await img4.init(image1)
    try {
      await img4.getMetadata('', '', '-all= ')
    } catch (e) {
      log(e)
      expect(e).toBeInstanceOf(Error)
    }
  })

  test(
    'stripMetadata: strip all the metadata out of a file and keep a backup of the '
      + 'original file',
    async () => {
      const log = debug.extend('test-16-stripMetadata')
      log()
      // test stripping all metadata from an image file
      expect.assertions(2)
      let img1 = new Exiftool()
      // init with strip.jpg image 4
      img1 = await img1.init(image4)
      const result = await img1.stripMetadata()
      expect(result.value).toBeTruthy()
      expect(result.original).toMatch(/_original/)
    },
  )

  test('writeMetadataToTag: write new metadata to one of more designate tags', async () => {
    const log = debug.extend('test-17-writeMetadataToTag')
    // test writing new metadata to a designated tag
    let img1 = new Exiftool()
    // init with copper.jpg image1
    img1 = await img1.init(image1)
    const data1 = '-IPTC:Headline="Wow, Great Photo!" -IPTC:Keywords+=TEST'
    log(data1)
    const result1 = await img1.writeMetadataToTag(data1)
    expect.assertions(3)
    expect(result1).toHaveProperty('value', true)
    expect(result1.stdout.trim()).toMatch(/1 image files updated/)

    // test writing new metadata to more than one designated tag
    let img2 = new Exiftool()
    // init with strip.jpg image 4
    img2 = await img2.init(image4)
    try {
      await img2.writeMetadataToTag()
    } catch (e) {
      expect(e).toBeInstanceOf(Error)
    }
  })

  test('clearMetadataFromTag: clear metadata from one or more designated tags', async () => {
    const log = debug.extend('test-18-clearMetadataFromTag')
    // test clearing metadata values from a designated tag
    let img1 = new Exiftool()
    // init with strip.jpg image4
    img1 = await img1.init(image4)
    const data1 = '-IPTC:Headline="Wow, Great Photo!" -IPTC:Contact=TEST'
    log(data1)
    await img1.writeMetadataToTag(data1)
    const tag = ['-IPTC:Headline^=', '-IPTC:Contact^=']
    const result1 = await img1.clearMetadataFromTag(tag)
    expect(result1.stdout.trim()).toMatch(/1 image files updated/)
  })

  test(
    'raw: send a fully composed exiftool command, bypassing instance config defualts',
    async () => {
      const log = debug.extend('test-19-raw')
      // test sending a raw exiftool command
      const img1 = new Exiftool()
      const command = `${executable} -G -json -EXIF:ImageDescription -IPTC:ObjectName `
        + `-IPTC:Keywords ${image1}`
      log(command)
      const result1 = await img1.raw(command)
      expect(result1[0]).toHaveProperty('IPTC:ObjectName')
    },
  )

  test('nemo: set the gps location to point nemo', async () => {
    const log = debug.extend('test-20-nemo')
    // test set location to point nemo
    const img1 = await new Exiftool().init(image5)
    img1.setGPSCoordinatesOutputFormat('gps')
    await img1.nemo()
    const result1 = await img1.getMetadata('', null, '-GPS:all')
    log(result1[0]['EXIF:GPSLatitude'])
    expect.assertions(2)
    expect(result1[0]).toHaveProperty('EXIF:GPSLatitude')
    expect(Number.parseFloat(result1[0]['EXIF:GPSLatitude'])).toEqual(22.319469)
  })

  test('null island: set the gps location to null island', async () => {
    const log = debug.extend('test-21-null-island')
    // test set location to null island
    const img1 = await new Exiftool().init(image6)
    img1.setGPSCoordinatesOutputFormat('gps')
    await img1.nullIsland()
    const result1 = await img1.getMetadata('', null, '-GPS:all')
    expect.assertions(2)
    expect(result1[0]).toHaveProperty('EXIF:GPSLatitude')
    log(result1[0]['EXIF:GPSLatitude'])
    expect(Number.parseFloat(result1[0]['EXIF:GPSLatitude'])).toEqual(0)
  })

  test('set output format to xml', async () => {
    const log = debug.extend('test-22-output-to-xml')
    log()
    const img8 = await new Exiftool().init(image8)
    const shouldBeTrue = img8.setOutputFormat('xml')
    expect.assertions(3)
    expect(shouldBeTrue).toBeTruthy()
    const result1 = await img8.getMetadata('', null, '-File:all')
    expect(result1[1].raw.slice(0, 5)).toMatch('<?xml')
    expect(result1[result1.length - 3].format).toEqual('xml')
  })

  test('get xmp packet', async () => {
    const log = debug.extend('test-23-xmp-packet')
    const img8 = await new Exiftool().init(image8)
    const packet = await img8.getXmpPacket()
    log(packet)
    const pattern = /^<\?xpacket .*\?>.*/
    expect(packet.xmp).toMatch(pattern)
  })

  test('exiftool command not found', async () => {
    const log = debug.extend('test-24-command-not-found')
    log()
    const exiftoolNotFound = new Exiftool(null, true)
    try {
      await exiftoolNotFound.init(image1)
    } catch (e) {
      expect(e.message).toEqual(expect.stringMatching(/attention/i))
    }
    const exiftool = await new Exiftool().init(image1)
    expect(exiftool._executable).toEqual(expect.stringMatching(/.+\/exiftool?/))
  })

  test('handle spaces in image path', async () => {
    const log = debug.extend('test-25-spaces-in-image-path')
    try {
      const exiftool = await new Exiftool().init(spaceyPath)
      const metadata = await exiftool.getMetadata('', 'Preview:all')
      expect(metadata).toHaveLength(4)
    } catch (e) {
      log(e)
    }
  })

  test('handle spaces in config file path', async () => {
    const log = debug.extend('test-26-spaces-in-config-file-path')
    const exiftool = await new Exiftool().init(spaceyPath)
    const newConfigFile = `${__dirname}/setConfigPathTest/SNAPCHAT MEMORIES/exiftool.config`
    log(newConfigFile)
    const result = await exiftool.setConfigPath(newConfigFile)
    log(result)
    expect.assertions(2)
    expect(result.value).toBeTruthy()
    expect(exiftool._command).toMatch(/SNAPCHAT/)
  })

  test('use getThumbnails() method to extract preview image data', async () => {
    const log = debug.extend('test-27-get-thumbnails')
    const err = error.extend('test-27-get-thumbnails')
    let exiftool
    let thumbs
    try {
      exiftool = await new Exiftool().init(image8)
      thumbs = await exiftool.getThumbnails()
      log(thumbs[0]['EXIF:ThumbnailImage'])
    } catch (e) {
      err(e)
    }
    expect.assertions(1)
    expect(thumbs.length).toBeGreaterThanOrEqual(3)
  })

  test('use setThumbnail() method to embed preview image', async () => {
    const log = debug.extend('test-28-set-thumbnail')
    const err = error.extend('test-28-set-thumbnail')
    const exiftool = await new Exiftool().init(image9)
    let result
    log(`needs-a-thumbnail.jpg: ${image9}`)
    log(`thumbnail:             ${thumbnail}`)
    try {
      result = await exiftool.setThumbnail(thumbnail)
    } catch (e) {
      err(e)
    }
    expect.assertions(1)
    expect(result.success).toBeTruthy()
  })
})
