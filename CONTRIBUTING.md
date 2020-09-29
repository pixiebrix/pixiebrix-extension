# Contributing to PixieBrix

## Did you find a bug?

*If you are reporting a security bug, please contact the maintainers privately
by emailing todd@pixiebrix.com.*

Check if the bug has already been reported by searching on GitHub under [Issues](https://github.com/pixiebrix/pixiebrix-extension/issues).

* If an issue already exists, give the first comment a "thumbs up" to indicate you're also having the problem.
When possible, add a comment with any additional context that's not already covered in the discussion.

* If you're not able to find an existing issue, [open a new issue](https://github.com/pixiebrix/pixiebrix-extension/issues/new).
Provide information about the what you were trying to do, the expected behavior, and the actual behavior.


## Adding Extension Points, Bricks, Services, and Recipes

To contribute new entities, create a pull request with the YAML files. See the
[contrib](https://github.com/pixiebrix/pixiebrix-extension/tree/master/contrib) folder
for examples.

## Feature Pull Requests

* If it's a major new feature, first create a new issue detailing what you're trying
to accomplish and why.
* Once you get the go ahead from the project maintainers: fork the repository,
create a branch with the issue # in the name, run the [pre-commit](https://pre-commit.com/)
hooks, and submit the PR.

Whenever possible, implement new entities via YAML files instead of
Javascript / Typescript classes. We can publish these independent of browser
extension releases.

## License

By contributing to this repository in any form, including creating issues and/or sending
a pull request via GitHub, you agree to release your contribution under the terms of the
[BSD 3-Clause License](https://github.com/pixiebrix/pixiebrix-browser/blob/master/LICENSE).
