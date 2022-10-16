import { Exiftool } from '../index.js'
import Debug from 'debug'
const debug = Debug('exiftool:metadata')
//const debug = require('debug')('exiftool:metadata')

debug(Exiftool)
//console.dir(Exiftool)


describe("My first jest test", () => {
  test("it should make an instance", () => {
    const exif = new Exiftool()
    expect(typeof exif).toEqual('object')
  })
})
