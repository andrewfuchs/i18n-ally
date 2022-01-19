import { TextDocument } from 'vscode'
import { LanguageId } from '../utils'
import { Framework } from './base'
import { DetectionResult } from '~/core'
import { extractionsParsers, DefaultExtractionRules, DefaultDynamicExtractionsRules } from '~/extraction'

// import { ScopeRange } from '.'
// import {dirname} from 'path'

class HappyReturnsFramework extends Framework {
  id = 'happy-returns'
  display = 'happy-returns'

  namespaceDelimiter = '.'
  namespaceDelimiters = ['.']
  namespaceDelimitersRegex = /\./g

  detection = {
    packageJSON: [
      '@paypalcorp/worldready',
      'worldready'
    ],
  }

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

  pathMatcher = () => '{locale}/**/{namespace}.{ext}'

  // for visualize the regex, you can use https://regexper.com/
  usageMatchRegex = [
    //new MessageFormat({id: 'key'})
    /MessageFormat\([^\(\)']+'([^']+)/g,
    // <Message id='key' />
    /<Message[^<>']+'([^']+)/g,
  ]

  refactorTemplates(keypath: string, args?: string[], document?: TextDocument, detection?: DetectionResult): string[] {
    //return [JSON.stringify(detection)]

    let params = `'${keypath}'`
    let messageTag = ''
    {
      let formatArgs = ''
      if (args?.length)
        formatArgs = args.map(arg => `${arg}=${arg}`).join('\n')
      messageTag = `<Message id=${params} ${formatArgs}/>`
    }
    let messageCall = ''
    {
      let formatArgs = ''
      if (args?.length)
        formatArgs = args.join(',\n')
      messageCall = `new MessageFormat(worldready, {id: ${params}}).format(${formatArgs})`
    }
    switch (detection?.source) {
      case 'jsx-text': {
        return [messageTag, messageCall]
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

  // getScopeRange(document: TextDocument): ScopeRange[] | undefined {
  //   return [{
  //     namespace: dirname(document.fileName).split('/').pop() || '',
  //     start: 0,
  //     end: document.getText().length - 1,
  //   }]
  // }

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
