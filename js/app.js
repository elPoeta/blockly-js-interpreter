let demoWorkspace = Blockly.inject('blocklyDiv',
  {
    media: '/assets/',
    toolbox: document.getElementById('toolbox')
  });
Blockly.Xml.domToWorkspace(document.getElementById('startBlocks'),
  demoWorkspace);
Blockly.JavaScript.addReservedWords('exit');
const outputArea = document.getElementById('output');
const outputJsArea = document.getElementById('outputJS');
const stepButton = document.getElementById('stepButton');
const runButton = document.getElementById('runButton');
let myInterpreter = null;
let runner = null;
function initApi(interpreter, globalObject) {
  // Add an API function for the alert() block, generated for "text_print" blocks.
  interpreter.setProperty(globalObject, 'alert',
    interpreter.createNativeFunction(function (text) {
      text = arguments.length ? text : '';
      outputArea.value += '\n' + text;
    }));

  // Add an API function for the prompt() block.
  var wrapper = function (text) {
    return interpreter.createPrimitive(prompt(text));
  };
  interpreter.setProperty(globalObject, 'prompt',
    interpreter.createNativeFunction(wrapper));

  // Add an API function for highlighting blocks.
  var wrapper = function (id) {
    id = String(id || '');
    return interpreter.createPrimitive(highlightBlock(id));
  };
  interpreter.setProperty(globalObject, 'highlightBlock',
    interpreter.createNativeFunction(wrapper));
}

let highlightPause = false;
let latestCode = '';

function highlightBlock(id) {
  demoWorkspace.highlightBlock(id);
  highlightPause = true;
}

function resetStepUi(clearOutput) {
  demoWorkspace.highlightBlock(null);
  highlightPause = false;
  runButton.disabled = '';
  if (clearOutput) {
    outputArea.value = 'Program output:\n=================';
    outputJsArea.value = '// JavaScript  Code\n\n';
  }
}

function resetInterpreter() {
  myInterpreter = null;
  if (runner) {
    clearTimeout(runner);
    runner = null;
  }
}

function generateCodeAndLoadIntoInterpreter() {
  // Generate JavaScript code and parse it.
  Blockly.JavaScript.STATEMENT_PREFIX = 'highlightBlock(%1);\n';
  Blockly.JavaScript.addReservedWords('highlightBlock');
  latestCode = Blockly.JavaScript.workspaceToCode(demoWorkspace);
  resetStepUi(true);
}

function stepCode() {
  if (!myInterpreter) {
    // First statement of this code.
    // Clear the program output.
    resetStepUi(true);
    myInterpreter = new Interpreter(latestCode, initApi);

    // And then show generated code in an alert.
    // In a timeout to allow the outputArea.value to reset first.
    setTimeout(function () {
      outputJsArea.value += latestCode;
      highlightPause = true;
      stepCode();
    }, 1);
    return;
  }
  highlightPause = false;
  do {
    try {
      var hasMoreCode = myInterpreter.step();
    } finally {
      if (!hasMoreCode) {
        // Program complete, no more code to execute.
        outputArea.value += '\n\n<< Program complete >>';

        myInterpreter = null;
        resetStepUi(false);

        // Cool down, to discourage accidentally restarting the program.
        stepButton.disabled = 'disabled';
        setTimeout(function () {
          stepButton.disabled = '';
        }, 2000);

        return;
      }
    }
    // Keep executing until a highlight statement is reached,
    // or the code completes or errors.
  } while (hasMoreCode && !highlightPause);
}

function runCode() {
  if (!myInterpreter) {
    // First statement of this code.
    // Clear the program output.
    resetStepUi(true);
    runButton.disabled = 'disabled';

    // And then show generated code in an alert.
    // In a timeout to allow the outputArea.value to reset first.
    setTimeout(function () {
      outputJsArea.value += latestCode;

      // Begin execution
      highlightPause = false;
      myInterpreter = new Interpreter(latestCode, initApi);
      runner = function () {
        if (myInterpreter) {
          let hasMore = myInterpreter.run();
          if (hasMore) {
            // Execution is currently blocked by some async call.
            // Try again later.
            setTimeout(runner, 10);
          } else {
            // Program is complete.
            outputArea.value += '\n\n<< Program complete >>';
            resetInterpreter();
            resetStepUi(false);
            // runButton.disabled = '';
          }
        }
      };
      runner();
    }, 1);
    return;
  }
}

// Load the interpreter now, and upon future changes.
generateCodeAndLoadIntoInterpreter();
demoWorkspace.addChangeListener(function (event) {
  if (!(event instanceof Blockly.Events.Ui)) {
    // Something changed. Parser needs to be reloaded.
    resetInterpreter();
    generateCodeAndLoadIntoInterpreter();
  }
});
