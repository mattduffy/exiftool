import { promisify } from 'node:util'
import { exec } from 'node:child_process'

const cmd = promisify(exec)
const output = await cmd('which exiftool')
export const executable = output.stdout.trim()
