//import {jest} from '@jest/globals'
import { Exiftool } from '../index.js'
import Debug from 'debug'
const debug = Debug('exiftool:metadata')
//const debug = require('debug')('exiftool:metadata')

debug(Exiftool)

describe("Exiftool metadata extractor", () => {
  test("it should be an instance of Exiftool", () => {
    expect(new Exiftool()).toBeInstanceOf(Exiftool)
  })

  test("init: should fail without a path arguement", async () => {
    let img = new Exiftool()
    expect(img = await img.init()).toBeFalsy()
  })

  test("init: with a path should return a configured exiftool", async () => {
    expect.assertions(2)
    let img = new Exiftool()
    img = await img.init('__tests__/copper.jpg')
    expect(img._isDirectory).toBeDefined()
    expect(img).toHaveProperty('_fileStats')
  })

  test("which: exiftool is accessible in the path", async () => {
    let img  = new Exiftool()
    let exif = await img.which()
    expect(exif.value).toMatch(/exiftool/)
  })

  test("setPath: is the path to file or directory", async () => {
    expect.assertions(4)
    let img = new Exiftool()
    // missing path value
    let result1 = await img.setPath()
    expect(result1.value).toBeNull()
    expect(result1.error).toBe("A path to image or directory is required.")
    //expect(result1.errorCode).toBe('ERR_INVALID_ARG_TYPE')
    let result2 = await img.setPath('__tests__/copper.jpg')
    expect(result2.value).toBeTruthy()
    expect(result2.error).toBeNull()
  })

  test("hasExiftoolConfigFile: check if exiftool.config file is present", async () => {
    expect.assertions(2)
    let img1, img2
    img1 = new Exiftool()
    expect(await img1.hasExiftoolConfigFile()).toBeTruthy()

    img2 = new Exiftool()
    img2._exiftool_config = `${img2._cwd}/exiftool.config.missing`
    expect(await img2.hasExiftoolConfigFile()).toBeFalsy()
  })

  test("createExiftoolConfigFile: can create new exiftool.config file", async () => {
    expect.assertions(2)
    let img = new Exiftool()
    img = await img.init('./__tests__/')
    img._exiftool_config = `${img._cwd}/exiftool.config.test`
    let result = await img.createExiftoolConfigFile()
    expect(result.value).toBeTruthy()
    expect(img.hasExiftoolConfigFile()).toBeTruthy()
  })

  test("hasShortcut: check exiftool.config for a shortcut", async () => {
    expect.assertions(2)
    let img = new Exiftool()
    let result1 = await img.hasShortcut('BasicShortcut')
    expect(result1).toBeTruthy()
    let result2 = await img.hasShortcut('FakeShortcut')
    expect(result2).toBeFalsy()
  })

  test("addShortcut: add a new shortcut to the exiftool.config file", async () => {
    expect.assertions(4)
    let img1 = new Exiftool()
    let MattsNewCut = `MattsNewCut => ['exif:createdate', 'file:FileName']`
    let result1 = await img1.addShortcut( MattsNewCut )
    expect(result1.value).toBeTruthy()
    expect(result1.error).toBeNull()

    // check if new shortcut exists and can be returned
    let img2 = new Exiftool()
    img2 = await img2.init('__tests__/copper.jpg')
    let result2 = await img2.hasShortcut('MattsNewCut')
    expect(result2).toBeTruthy()

    // get metadata using new shortcut
    img2.setShortcut( 'MattsNewCut' )
    debug(img2._command) 
    let metadata = await img2.getMetadata()
    debug(metadata)
    expect(metadata).not.toBeNull()

  })

  test("getMetadata: specify tag list as an optional parameter", async () => {
    expect.assertions(5) 
    // test adding additional tags to the command
    let img1 = new Exiftool()
    img1 = await img1.init('./__tests__/copper.jpg')
    let result1 = await img1.getMetadata('', '', ['file:FileSize', 'file:DateTimeOriginal', 'file:Model'])
    expect(result1[0]).toHaveProperty('File:FileSize')
    expect(result1[0]).toHaveProperty('EXIF:ImageDescription')

    // test changing the file from one set in init()
    let img2 = new Exiftool()
    img2 = await img2.init('__tests__/copper.jpg')
    let result2 = await img2.getMetadata('__tests__/IMG_1820.jpg', '', ['file:FileSize', 'file:DateTimeOriginal', 'file:ImageSize'])
    expect(result2[0]).toHaveProperty('File:FileSize')
    expect(result2[0]).toHaveProperty('Composite:GPSPosition')

    // test passing a new shortcut name
    let img3 = new Exiftool()
    img3 = await img3.init('__tests__/IMG_1820.heic')
    let result3 = await img3.getMetadata('', 'MattsNewCut', ['file:FileSize', 'file:ImageSize'])
    expect(result3[0]).toHaveProperty('SourceFile')

  })

})
