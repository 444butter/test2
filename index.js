export function init(extensionAPI) {
    console.log("Test 2 Extension loaded successfully!");

    // Example: register a simple command
    extensionAPI.registerCommand("test2", (args) => {
        return "Hello from Test 2 Extension!";
    });
}
