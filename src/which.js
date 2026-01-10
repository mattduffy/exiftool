/**
 * @module @mattduffy/exiftool
 * @author Matthew Duffy <mattduffy@gmail.com>
 * @summary An ESM module exporting the local file system path to exiftool.
 * @file which.js
 */
import { promisify } from 'node:util'
import { exec } from 'node:child_process'

const cmd = promisify(exec)
async function which() {
  const output = await cmd('which exiftool')
  return output.stdout.trim()
}
// export const path = await which()
export const path = which()
