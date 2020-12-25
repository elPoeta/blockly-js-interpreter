class CustomBlockly {
  constructor() {
    this.localStorageHandler();
    this.demoWorkspace = Blockly.inject('blocklyDiv', {
      media: '/assets/',
      toolbox: document.getElementById('toolbox')
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
    });
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
    this.loadButton.addEventListener('click', this.loadExample.bind(this));
    this.runButton.addEventListener('click', this.runCode.bind(this));
    this.stepButton.addEventListener('click', this.stepCode.bind(this));
    this.typeJsOutput.addEventListener('change', this.typeJsOutputHandler.bind(this));
    this.saveButton.addEventListener('click', this.saveBlock.bind(this));
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
  }
}

new CustomBlockly();