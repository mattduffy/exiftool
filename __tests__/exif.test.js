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
    img._exiftool_config = `${img.cwd}/exiftool.config.test`
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

  test("setShortcut: add a new shortcut to the exiftool.config file", async () => {

  })

})
