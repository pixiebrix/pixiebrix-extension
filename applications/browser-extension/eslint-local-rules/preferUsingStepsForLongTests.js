module.exports = {
  create(context) {
    const sourceCode = context.getSourceCode();

    return {
      CallExpression(node) {
        if (
          node.callee.type === "Identifier" &&
          node.callee.name === "test" &&
          node.arguments.length > 1 &&
          node.arguments[1].type === "ArrowFunctionExpression"
        ) {
          const testFunctionBody = node.arguments[1].body;
          const isTestStepUsed = testFunctionBody.body.some(
            (statement) =>
              statement.type === "ExpressionStatement" &&
              statement.expression.type === "AwaitExpression" &&
              statement.expression.argument.type === "CallExpression" &&
              statement.expression.argument.callee.type ===
                "MemberExpression" &&
              statement.expression.argument.callee.object.name === "test" &&
              statement.expression.argument.callee.property.name === "step",
          );

          const startLine = node.arguments[1].loc.start.line;
          const endLine = node.arguments[1].loc.end.line;

          const commentLines = new Set();
          for (const comment of sourceCode.getAllComments()) {
            if (
              comment.loc.start.line >= startLine &&
              comment.loc.end.line <= endLine
            ) {
              for (
                let i = comment.loc.start.line;
                i <= comment.loc.end.line;
                i++
              ) {
                commentLines.add(i);
              }
            }
          }

          const lineCount = endLine - startLine + 1 - commentLines.size;

          if (!isTestStepUsed && lineCount > 60) {
            context.report({
              node,
              message:
                `Playwright test is over 60 lines long (${lineCount} lines, ${commentLines.size} comment lines not included), and is not split up by steps. Use \`test.step\` to split up ` +
                "the test into smaller steps or refactor functionality into helper methods or page objects.",
            });
          }
        }
      },
    };
  },
};
