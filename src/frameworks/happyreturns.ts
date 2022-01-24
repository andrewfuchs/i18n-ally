import { dirname } from 'path'
import { TextDocument } from 'vscode'
import { LanguageId } from '../utils'
import { Framework } from './base'
import { ScopeRange } from '.'
import { DetectionResult} from '~/core'
import { extractionsParsers, DefaultExtractionRules, DefaultDynamicExtractionsRules } from '~/extraction'
class HappyReturnsFramework extends Framework {
  id = 'happy-returns'
  display = 'happy-returns'

  namespaceDelimiter = ':'
  namespaceDelimiters = [':', '/']
  namespaceDelimitersRegex = /[:/]/g

  // always activated
  detection = {
    packageJSON: () => true,
  }

  // enable only this framework
  monopoly = true

  languageIds: LanguageId[] = [
    'javascript',
    'typescript',
    'javascriptreact',
    'typescriptreact',
    'ejs',
  ]

  enableFeatures = {
    namespace: true,
  }

  // not sure exactly how this affects things
  // derivedKeyRules = [
  //   '{key}_plural',
  //   '{key}_0',
  //   '{key}_1',
  //   '{key}_2',
  //   '{key}_3',
  //   '{key}_4',
  //   '{key}_5',
  //   '{key}_6',
  //   '{key}_7',
  //   '{key}_8',
  //   '{key}_9',
  // ]

  pathMatcher = () => '{locale}/**/{namespace}.{ext}'

  // for visualize the regex, you can use https://regexper.com/
  usageMatchRegex = [
    /t\(['"]([^'"]+)/g,
    /<Trans[^<>'"]+['"]([^'"]+)/g,
  ]

  // rewriteKeys(key: string, source: RewriteKeySource, context: RewriteKeyContext = {}) {
  //   return key?.split('.')?.pop() || key
  // }

  refactorTemplates(keypath: string, args?: string[], document?: TextDocument, detection?: DetectionResult): string[] {
    // return [JSON.stringify(detection)]

    const keyWithoutNamespace = keypath?.split('.')?.pop() || keypath

    const params = `'${keyWithoutNamespace}'`
    let messageTag = ''
    {
      let formatArgs = ''
      if (args?.length)
        formatArgs = args.map(arg => `${arg}=${arg}`).join('\n')
      messageTag = `<Trans i18nKey=${params} ${formatArgs}/>`
    }
    let messageCall = ''
    {
      let formatArgs = ''
      if (args?.length)
        formatArgs = `, {${args.join(', ')}}`
      messageCall = `t(${params}${formatArgs})`
    }
    switch (detection?.source) {
      case 'jsx-text': {
        return [`{${messageCall}}`, messageTag]
      }
      case 'js-string': {
        return [messageCall, messageTag]
      }
    }
    return [messageCall, messageTag]

    // if (args?.length)
    //   params += `, [${args.join(', ')}]`

    // switch (detection?.source) {
    //   case 'html-inline':
    //     return [`{{ $t(${params}) }}`]
    //   case 'html-attribute':
    //     return [`$t(${params})`]
    //   case 'js-string':
    //     return [`$t(${params})`, `this.$t(${params})`]
    //   case 'js-template':

    //   case 'jsx-text':
    //     return ``
    // }

    // return [
    //   `{{ $t(${params}) }}`,
    //   `this.$t(${params})`,
    //   `$t(${params})`,
    //   keypath,
    // ]
  }

  // supportAutoExtraction = Object.keys(
  //   LanguageIdExtMap
  // )

  supportAutoExtraction = [
    'javascript',
    'typescript',
    'javascriptreact',
    'typescriptreact',
    'ejs',
  ]

  getScopeRange(document: TextDocument): ScopeRange[] | undefined {
    const ranges: ScopeRange[] = []
    const text = document.getText()
    const reg = /getTranslator\(['"]([^'"]+)/g

    for (const match of text.matchAll(reg)) {
      if (match?.index == null)
        continue

      // end previous scope
      if (ranges.length)
        ranges[ranges.length - 1].end = match.index

      // start new scope if namespace provides
      if (match[1]) {
        ranges.push({
          start: match.index,
          end: text.length,
          namespace: match[1] as string,
        })
      }
    }

    return ranges.length
      ? ranges
      : [{
        namespace: dirname(document.fileName).split('/').pop() || '',
        start: 0,
        end: text.length - 1,
      }]
  }

  detectHardStrings(doc: TextDocument) {
    const text = doc.getText()

    return extractionsParsers.babel.detect(
      text,
      DefaultExtractionRules,
      DefaultDynamicExtractionsRules,
    )
  }
}

export default HappyReturnsFramework
