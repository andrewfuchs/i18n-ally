import { basename, extname, dirname } from 'path'
import { TextDocument, window } from 'vscode'
import { nanoid } from 'nanoid'
import { Config, Global } from '../extension'
import { ExtractInfo } from './types'
import { CurrentFile } from './CurrentFile'
import { changeCase } from '~/utils/changeCase'
import { camelCase } from 'lodash'

export function generateKeyFromText(text: string, filepath?: string, reuseExisting = false, usedKeys: Record<string, string> = {}): string {
  let key: string | undefined

  // already existed, reuse the key
  // mostly for auto extraction
  // if (reuseExisting) {
  //   key = Global.loader.searchKeyForTranslations(text)
  //   if (key)
  //     return key
  // }

  // keygent
  const keygenStrategy = Config.keygenStrategy
  if (keygenStrategy === 'random') {
    key = nanoid()
  }
  else if (keygenStrategy === 'empty') {
    key = ''
  }
  else {
    let len = 0
    const shortenedKey = []
    const words = text.split(/\s+/g)
    do {
      const word = words.shift() || ''
      len += word.length
      shortenedKey.push(word)
    } while (len <= 16 && words?.length)
    key = camelCase(shortenedKey.join(' '))
  }

  const keyPrefix = Config.keyPrefix
  if (keyPrefix && keygenStrategy !== 'empty')
    key = keyPrefix + key

  if (filepath && key.includes('fileName')) {
    key = key
      .replace('{fileName}', basename(filepath))
      .replace('{fileNameWithoutExt}', basename(filepath, extname(filepath)))
  }

  if (filepath && key.includes('dirName')) {
    key = key
      .replace('{dirName}', dirname(filepath).split("/").pop() || basename(filepath))
  }

  key = changeCase(key, Config.keygenStyle).trim()

  // some symbol can't convert to alphabet correctly, apply a default key to it
  if (!key)
    key = 'key'

  const existingKey = Global.loader.searchKeyForTranslations(text)
  if (key === existingKey)
    return key

  if (usedKeys[key] === text)
    return key

  // suffix with a auto increment number if same key
  if (usedKeys[key] || CurrentFile.loader.getNodeByKey(key)) {
    const originalKey = key
    let num = 0

    do {
      key = `${originalKey}${Config.preferredDelimiter}${num}`
      num += 1
    } while (
      usedKeys[key] || CurrentFile.loader.getNodeByKey(key, false)
    )
  }

  return key
}

export async function extractHardStrings(document: TextDocument, extracts: ExtractInfo[], saveFile = false) {
  if (!extracts.length)
    return

  const editor = await window.showTextDocument(document)
  const filepath = document.uri.fsPath
  const sourceLanguage = Config.sourceLanguage

  extracts.sort((a, b) => b.range.start.compareTo(a.range.start))

  // replace
  await editor.edit((editBuilder) => {
    for (const extract of extracts) {
      editBuilder.replace(
        extract.range,
        extract.replaceTo,
      )
    }
  })

  // save keys
  await CurrentFile.loader.write(
    extracts
      .filter(i => i.keypath != null && i.message != null)
      .map(e => ({
        textFromPath: filepath,
        filepath: undefined,
        keypath: e.keypath!,
        value: e.message!,
        locale: e.locale || sourceLanguage,
      })),
  )

  if (saveFile)
    await document.save()

  CurrentFile.invalidate()
}
