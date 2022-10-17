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

  test("init should fail without a path arguement", async () => {
    let img = new Exiftool()
    expect(img = await img.init()).toBeFalsy()
  })

  test("init with a path should return a configured exiftool", async () => {
    let img = new Exiftool()
    img = await img.init('__tests__/copper.jpg')
    expect(img._isDirectory).toBeDefined()
    expect(img).toHaveProperty('_fileStats')
  })
})
