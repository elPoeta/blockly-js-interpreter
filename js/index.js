class CustomBlockly {
  constructor() {
    this.LANGUAGE_NAME = {
      'en': 'English',
      'es': 'Español'
    };
    this.LANG = this.getLang();
    this.addScriptLanguage();
  }

  getToolbox() {
    // return {
    //   "kind": "categoryToolbox",
    //   "contents": [
    //     {
    //       "kind": "category",
    //       "name": "Logic",
    //       "contents": [
    //         {
    //           "kind": "block",
    //           "type": "controls_if"
    //         },
    //         {
    //           "kind": "block",
    //           "type": "logic_compare"
    //         },
    //         {
    //           "kind": "block",
    //           "type": "logic_operation"
    //         },
    //         {
    //           "kind": "block",
    //           "type": "logic_boolean"
    //         }
    //       ]
    //     },
    //     {
    //       "kind": "category",
    //       "name": "Control",
    //       "contents": [
    //         {
    //           "kind": "block",
    //           "type": "controls_for"
    //         },

    //         {
    //           "kind": "block",
    //           "type": "controls_whileUntil"
    //         }
    //       ]
    //     }
    //   ]
    // }

  }

  localStorageHandler() {
    const xmlString = localStorage.getItem('xml') || this.getXmlExampleTemplate();
    localStorage.setItem('xml', xmlString);
  }

  initApi(interpreter, globalObject) {
    // Add an API function for the alert() block, generated for "text_print" blocks.
    interpreter.setProperty(globalObject, 'alert',
      interpreter.createNativeFunction(text => {
        text = arguments.length ? text : '';
        this.outputArea.value += '\n' + text;
      }));

    // Add an API function for the prompt() block.
    let wrapper = text => {
      return interpreter.createPrimitive(prompt(text));
    };
    interpreter.setProperty(globalObject, 'prompt',
      interpreter.createNativeFunction(wrapper));

    // Add an API function for highlighting blocks.
    wrapper = id => {
      id = String(id || '');
      return interpreter.createPrimitive(this.highlightBlock(id));
    };
    interpreter.setProperty(globalObject, 'highlightBlock',
      interpreter.createNativeFunction(wrapper));
  }

  highlightBlock(id) {
    this.demoWorkspace.highlightBlock(id);
    this.highlightPause = true;
  }

  resetStepUi(clearOutput) {
    this.demoWorkspace.highlightBlock(null);
    this.highlightPause = false;
    this.runButton.disabled = '';

    if (clearOutput) {
      this.outputArea.value = 'Program output:\n=================';
      this.outputJsArea.value = '// JavaScript output\n\n';
    }
  }

  resetInterpreter() {
    this.myInterpreter = null;
    if (this.runner) {
      clearTimeout(this.runner);
      this.runner = null;
    }
  }

  generateCodeAndLoadIntoInterpreter() {
    // Generate JavaScript code and parse it.
    Blockly.JavaScript.STATEMENT_PREFIX = 'highlightBlock(%1);\n';
    Blockly.JavaScript.addReservedWords('highlightBlock');
    this.latestCode = Blockly.JavaScript.workspaceToCode(this.demoWorkspace);
    this.resetStepUi(true);
  }

  addButtonListener() {
    this.loadButton = document.querySelector('#loadButton');
    this.runButton = document.querySelector('#runButton');
    this.stepButton = document.querySelector('#stepButton');
    this.typeJsOutput = document.querySelector('#typeJsOutput');
    this.saveButton = document.querySelector('#saveButton');
    this.cleanOutputButton = document.querySelector('#cleanOutputButton');
    this.loadButton.addEventListener('click', this.loadExample.bind(this));
    this.runButton.addEventListener('click', this.runCode.bind(this));
    this.stepButton.addEventListener('click', this.stepCode.bind(this));
    this.typeJsOutput.addEventListener('change', this.typeJsOutputHandler.bind(this));
    this.saveButton.addEventListener('click', this.saveBlock.bind(this));
    this.cleanOutputButton.addEventListener('click', this.cleanOutputHandler.bind(this));
  }

  loadExample(ev) {
    // const doc = new DOMParser().parseFromString(this.getXmlExampleTemplate(), "text/xml")
    const contentsBeforeClearing = this.demoWorkspace.trashcan.contents_;
    this.demoWorkspace.clear();
    this.demoWorkspace.trashcan.contents_ = contentsBeforeClearing;
    //Blockly.Xml.domToWorkspace(doc.firstChild, this.demoWorkspace);
    const xmlString = localStorage.getItem('xml');
    const xml = Blockly.Xml.textToDom(xmlString);
    Blockly.Xml.domToWorkspace(xml, this.demoWorkspace);
  }

  getXmlExampleTemplate() {
    return ` <xml xmlns="https://developers.google.com/blockly/xml" id="startBlocks" style="display: none">
    <block type="variables_set" id="set_n_initial" inline="true" x="20" y="20">
      <field name="VAR">n</field>
      <value name="VALUE">
        <block type="math_number">
          <field name="NUM">1</field>
        </block>
      </value>
      <next>
        <block type="controls_repeat_ext" id="repeat" inline="true">
          <value name="TIMES">
            <block type="math_number">
              <field name="NUM">4</field>
            </block>
          </value>
          <statement name="DO">
            <block type="variables_set" id="set_n_update" inline="true">
              <field name="VAR">n</field>
              <value name="VALUE">
                <block type="math_arithmetic" inline="true">
                  <field name="OP">MULTIPLY</field>
                  <value name="A">
                    <block type="variables_get">
                      <field name="VAR">n</field>
                    </block>
                  </value>
                  <value name="B">
                    <block type="math_number">
                      <field name="NUM">2</field>
                    </block>
                  </value>
                </block>
              </value>
              <next>
                <block type="text_print" id="print">
                  <value name="TEXT">
                    <block type="variables_get">
                      <field name="VAR">n</field>
                    </block>
                  </value>
                </block>
              </next>
            </block>
          </statement>
        </block>
      </next>
    </block>
  </xml>`
  }

  typeJsOutputHandler(ev) {
    this.isOutputChecked = !this.isOutputChecked;
  }

  runCode(ev) {
    if (!this.myInterpreter) {
      // First statement of this code.
      // Clear the program output.
      this.resetStepUi(true);
      this.runButton.disabled = 'disabled';

      // And then show generated code in an alert.
      // In a timeout to allow the outputArea.value to reset first.
      setTimeout(() => {
        this.outputJsArea.value += this.isOutputChecked ?
          this.latestCode.replace(/highlightBlock\(.+\);/gi, '').replace(/\n\s*\n/g, '\n') :
          this.latestCode;

        // Begin execution
        this.highlightPause = false;
        this.myInterpreter = new Interpreter(this.latestCode, this.initApi.bind(this));
        this.runner = () => {
          if (this.myInterpreter) {
            let hasMore = this.myInterpreter.run();
            if (hasMore) {
              // Execution is currently blocked by some async call.
              // Try again later.
              setTimeout(this.runner, 10);
            } else {
              // Program is complete.
              this.outputArea.value += '\n\n<< Program complete >>';
              this.resetInterpreter();
              this.resetStepUi(false);
              // runButton.disabled = '';
            }
          }
        };
        this.runner();
      }, 1);
      return;
    }
  }

  stepCode(ev) {
    if (!this.myInterpreter) {
      // First statement of this code.
      // Clear the program output.
      this.resetStepUi(true);
      this.myInterpreter = new Interpreter(this.latestCode, this.initApi.bind(this));

      // And then show generated code in an alert.
      // In a timeout to allow the outputArea.value to reset first.
      setTimeout(() => {
        this.outputJsArea.value += this.isOutputChecked ?
          this.latestCode.replace(/highlightBlock\(.+\);/gi, '').replace(/\n\s*\n/g, '\n') :
          this.latestCode;
        this.highlightPause = true;
        this.stepCode();
      }, 1);
      return;
    }
    this.highlightPause = false;
    do {
      try {
        this.hasMoreCode = this.myInterpreter.step();
      } finally {
        if (!this.hasMoreCode) {
          // Program complete, no more code to execute.
          this.outputArea.value += '\n\n<< Program complete >>';

          this.myInterpreter = null;
          this.resetStepUi(false);

          // Cool down, to discourage accidentally restarting the program.
          this.stepButton.disabled = 'disabled';
          setTimeout(() => {
            this.stepButton.disabled = '';
          }, 2000);

          return;
        }
      }
      // Keep executing until a highlight statement is reached,
      // or the code completes or errors.
    } while (this.hasMoreCode && !this.highlightPause);
  }

  saveBlock(ev) {
    const xml = Blockly.Xml.workspaceToDom(this.demoWorkspace);
    const xmlString = Blockly.Xml.domToText(xml);
    localStorage.setItem('xml', xmlString);
    // const x2js = new X2JS();
    // const xmlText = xmlString
    // const jsonObj = x2js.xml_str2json(xmlText);
    alert("Saved!!!")
    //console.log(jsonObj)
    //const newxml = x2js.json2xml_str(jsonObj)
    //console.log(newxml);
  }

  getLang() {
    let lang = this.getStringParamFromUrl('lang', '');
    if (this.LANGUAGE_NAME[lang] === undefined) {
      // Default to English.
      lang = 'en';
    }
    return lang;
  }

  getStringParamFromUrl(name, defaultValue) {
    let val = location.search.match(new RegExp('[?&]' + name + '=([^&]+)'));
    return val ? decodeURIComponent(val[1].replace(/\+/g, '%20')) : defaultValue;
  }

  initLanguage() {
    document.dir = 'ltr';
    document.head.parentElement.setAttribute('lang', this.LANG);

    // Sort languages alphabetically.
    let languages = [];
    for (let lang in this.LANGUAGE_NAME) {
      languages.push([this.LANGUAGE_NAME[lang], lang]);
    }
    var comp = function (a, b) {
      // Sort based on first argument ('English', 'Русский', '简体字', etc).
      if (a[0] > b[0]) return 1;
      if (a[0] < b[0]) return -1;
      return 0;
    };
    languages.sort(comp);
    this.languageMenu = document.querySelector('#languageMenu');
    this.languageMenu.options.length = 0;
    for (var i = 0; i < languages.length; i++) {
      let tuple = languages[i];
      let lang = tuple[tuple.length - 1];
      let option = new Option(tuple[0], lang);
      if (lang == this.LANG) {
        option.selected = true;
      }
      this.languageMenu.options.add(option);
    }
    languageMenu.addEventListener('change', this.changeLanguage.bind(this), true);
  }

  changeLanguage() {
    let newLang = encodeURIComponent(
      this.languageMenu.options[this.languageMenu.selectedIndex].value);
    let search = window.location.search;
    if (search.length <= 1) {
      search = '?lang=' + newLang;
    } else if (search.match(/[?&]lang=[^&]*/)) {
      search = search.replace(/([?&]lang=)[^&]*/, '$1' + newLang);
    } else {
      search = search.replace(/\?/, '?lang=' + newLang + '&');
    }

    window.location = window.location.protocol + '//' +
      window.location.host + window.location.pathname + search;
  }

  addScriptLanguage() {
    const container = document.querySelector('head');
    const script = document.createElement("script");
    script.src = `./js/third_party/${this.LANG}.js`;
    container.appendChild(script);
    const scriptString = document.createElement("script");
    scriptString.src = `./js/third_party/msg_blk/${this.LANG}.js`;
    container.appendChild(scriptString);

    scriptString.addEventListener('load', ev => {
      for (let messageKey in MSG) {
        if (messageKey.indexOf('cat') == 0) {
          Blockly.Msg[messageKey.toUpperCase()] = MSG[messageKey];
        }
      }

      // Construct the toolbox XML, replacing translated variable names.
      let toolboxText = document.getElementById('toolbox').outerHTML;
      toolboxText = toolboxText.replace(/(^|[^%]){(\w+)}/gi,
        function (m, p1, p2) {
          return p1 + MSG[p2];
        });

      const toolboxXml = Blockly.Xml.textToDom(toolboxText);
      this.startWorkspace(toolboxXml);
    });

  }

  startWorkspace(toolboxXml) {
    this.initLanguage();
    this.localStorageHandler();
    this.demoWorkspace = Blockly.inject('blocklyDiv', {
      media: '/assets/',
      toolbox: toolboxXml,
      zoom:
      {
        controls: true,
        wheel: true
      }
    });
    Blockly.JavaScript.addReservedWords('exit');
    this.outputArea = document.getElementById('output');
    this.outputJsArea = document.getElementById('outputJS');
    this.stepButton = document.getElementById('stepButton');
    this.runButton = document.getElementById('runButton');
    this.myInterpreter = null;
    this.runner = null;
    this.highlightPause = false;
    this.latestCode = '';
    this.isOutputChecked = true;
    this.addButtonListener();
    this.generateCodeAndLoadIntoInterpreter();
    this.demoWorkspace.addChangeListener(event => {
      if (!(event instanceof Blockly.Events.Ui)) {
        // Something changed. Parser needs to be reloaded.
        this.resetInterpreter();
        this.generateCodeAndLoadIntoInterpreter();
      }
      let code = Blockly.JavaScript.workspaceToCode(this.demoWorkspace);
      if (code !== '') {
        this.outputJsArea.value = '// JavaScript output\n\n';
        this.outputJsArea.value += this.isOutputChecked ?
          code.replace(/highlightBlock\(.+\);/gi, '').replace(/\n\s*\n/g, '\n') :
          code;
      }

    });
  }

  cleanOutputHandler(ev) {
    this.resetInterpreter();
    this.generateCodeAndLoadIntoInterpreter();
  }
}

new CustomBlockly();

