import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { rm } from 'node:fs/promises'
import Debug from 'debug'
/* eslint-disable import/extensions */
import { Exiftool } from '../index.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const debug = Debug('exiftool:metadata')
debug(Exiftool)

// Set the items to be used for all the tests here as constants.
const testsDir = __dirname
const imageDir = `${__dirname}/images`
const image1 = `${imageDir}/copper.jpg`
const image2 = `${imageDir}/IMG_1820.jpg`
const image3 = `${imageDir}/IMG_1820.heic`
const image4 = `${imageDir}/strip.jpg`
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
afterAll(async () => {
  try {
    const dir = __dirname.split('/')
    const file = `${dir.slice(0, dir.length - 1).join('/')}/exiftool.config`
    // const test = `${dir.slice(0, dir.length - 1).join('/')}/exiftool.config`
    debug(dir)
    await rm(`${file}.bk`)
    await rm(`${file}.test`)
  } catch (e) {
    debug(e)
  }
})

describe('Exiftool metadata extractor', () => {
  test('it should be an instance of Exiftool', () => {
    expect(new Exiftool()).toBeInstanceOf(Exiftool)
  })

  test('setExtensionsToExclude: update array of file type extensions to exclude', async () => {
    let img = new Exiftool()
    const extensionsArray = img.getExtensionsToExclude()
    extensionsArray.push('CONFIG')
    img.setExtensionsToExclude(extensionsArray)
    img = await img.init(image1)
    const excludes = img._opts.excludeTypes
    expect(excludes).toMatch(/CONFIG/)
  })

  test('init: should fail without a path arguement', async () => {
    let img = new Exiftool()
    expect(img = await img.init()).toBeFalsy()
  })

  test('init: with a path should return a configured exiftool', async () => {
    expect.assertions(2)
    let img = new Exiftool()
    img = await img.init(image1)
    expect(img._isDirectory).toBeDefined()
    expect(img).toHaveProperty('_fileStats')
  })

  test('which: exiftool is accessible in the path', async () => {
    const img = new Exiftool()
    const exif = await img.which()
    expect(exif.value).toMatch(/exiftool/)
  })

  test('get/setConfigPath: change the file system path to the exiftool.config file', async () => {
    expect.assertions(4)
    const img = new Exiftool()
    // setConfigPathTest/exiftool.config
    const newConfigFile = `${__dirname}/setConfigPathTest/exiftool.config`
    const oldConfigFile = img.getConfigPath()
    expect(oldConfigFile.value).toMatch(/exiftool\/exiftool.config$/)

    const result = await img.setConfigPath(newConfigFile)
    expect(result.value).toBeTruthy()
    expect(img._command).toMatch(/setConfigPathTest/)

    // test a bad file path
    // setConfigPathTest/bad/exiftool.config
    const badConfigFile = `${__dirname}/setConfigPathTest/bad/exiftool.config`
    const badResult = await img.setConfigPath(badConfigFile)
    // o.e.code == 'ENOENT'
    expect(badResult.e.code).toMatch(/ENOENT/)
  })

  test('setPath: is the path to file or directory', async () => {
    expect.assertions(5)
    const img = new Exiftool()
    // missing path value
    const result1 = await img.setPath()
    expect(result1.value).toBeNull()
    expect(result1.error).toBe('A path to image or directory is required.')
    const result2 = await img.setPath(image1)
    expect(result2.value).toBeTruthy()
    expect(result2.error).toBeNull()

    // test with a relative path to generate an error
    try {
      const img1 = new Exiftool()
      const nonRootPath = 'images/copper.jpg'
      await img1.init(nonRootPath)
    } catch (e) {
      expect(e).toBeInstanceOf(Error)
    }
  })

  test('hasExiftoolConfigFile: check if exiftool.config file is present', async () => {
    expect.assertions(2)
    const img1 = new Exiftool()
    debug('hasExiftoolConfigFile check - good check')
    expect(await img1.hasExiftoolConfigFile()).toBeTruthy()

    const img2 = new Exiftool()
    img2._exiftool_config = `${img2._cwd}/exiftool.config.missing`
    debug('hasExiftoolConfigFile check - bad check')
    expect(await img2.hasExiftoolConfigFile()).toBeFalsy()
  })

  test('createExiftoolConfigFile: can create new exiftool.config file', async () => {
    expect.assertions(2)
    let img = new Exiftool()
    img = await img.init(testsDir)
    img._exiftool_config = `${img._cwd}/exiftool.config.test`
    const result = await img.createExiftoolConfigFile()
    expect(result.value).toBeTruthy()
    expect(img.hasExiftoolConfigFile()).toBeTruthy()
  })

  test('hasShortcut: check exiftool.config for a shortcut', async () => {
    expect.assertions(2)
    const img = new Exiftool()
    const result1 = await img.hasShortcut(RealShortcut)
    expect(result1).toBeTruthy()
    const result2 = await img.hasShortcut(FakeShortcut)
    expect(result2).toBeFalsy()
  })

  test('addShortcut: add a new shortcut to the exiftool.config file', async () => {
    expect.assertions(4)
    const img1 = new Exiftool()
    const result1 = await img1.addShortcut(MattsNewCut)
    debug(result1)
    expect(result1.value).toBeTruthy()
    expect(result1.error).toBeNull()

    // check if new shortcut exists and can be returned
    let img2 = new Exiftool()
    img2 = await img2.init(image1)
    const result2 = await img2.hasShortcut(NewShortcut)
    expect(result2).toBeTruthy()

    // get metadata using new shortcut
    img2.setShortcut(NewShortcut)
    debug(img2._command)
    const metadata = await img2.getMetadata()
    debug(metadata)
    expect(metadata).not.toBeNull()
  })

  test('removeShortcut: remove a given shortcut from the exiftool.config file', async () => {
    const img1 = new Exiftool()
    const result1 = await img1.removeShortcut(NewShortcut)
    debug(result1)
    expect(result1.value).toBeTruthy()
  })

  test('getMetadata: specify tag list as an optional parameter', async () => {
    expect.assertions(2)
    // test adding additional tags to the command
    let img1 = new Exiftool()
    // init with the copper.jpg image1
    img1 = await img1.init(image1)
    const result1 = await img1.getMetadata('', '', ['file:FileSize', 'file:DateTimeOriginal', 'file:Model'])
    expect(result1[0]).toHaveProperty('File:FileSize')
    expect(result1[0]).toHaveProperty('EXIF:ImageDescription')
  })

  test('getMetadata: specify new file name and tag list as an optional parameter', async () => {
    // test changing the file from one set in init()
    expect.assertions(2)
    let img2 = new Exiftool()
    // init with copper.jpg image1
    img2 = await img2.init(image1)
    // replace image1 with IMG_1820.jpg
    const result2 = await img2.getMetadata(image2, '', ['file:FileSize', 'file:DateTimeOriginal', 'file:ImageSize'])
    expect(result2[0]).toHaveProperty('File:FileSize')
    expect(result2[0]).toHaveProperty('Composite:GPSPosition')
  })

  test('getMetadata: specify new shortcut name and tag list as an optional parameter', async () => {
    // test passing a new shortcut name
    let img3 = new Exiftool()
    // image3 is IMG_1820.heic
    img3 = await img3.init(image3)
    const result3 = await img3.getMetadata('', 'MattsNewCut', ['file:FileSize', 'file:ImageSize'])
    expect(result3[0]).toHaveProperty('SourceFile')
  })

  test('getMetadata: catch the forbidden -all= data stripping tag', async () => {
    // test catching the -all= stripping tag in get request
    let img4 = new Exiftool()
    // init with the copper.jpg image1
    img4 = await img4.init(image1)
    try {
      await img4.getMetadata('', '', '-all= ')
    } catch (e) {
      expect(e).toBeInstanceOf(Error)
    }
  })

  test('stripMetadata: strip all the metadata out of a file and keep a backup of the original file', async () => {
    expect.assertions(2)
    let img1 = new Exiftool()
    // init with strip.jpg image 4
    img1 = await img1.init(image4)
    const result = await img1.stripMetadata()
    expect(result.value).toBeTruthy()
    expect(result.original).toMatch(/_original/)
  })
})
