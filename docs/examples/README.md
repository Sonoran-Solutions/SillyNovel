# Documentation examples

These examples illustrate the proposed contract. They are not a running test suite, imported user content, or production state.

For [director-response.json](director-response.json), assume the source message `message_demo_001` is exactly:

> Rowan smiles.

The request's allowed catalog includes character `char_rowan` and expression `joy`. The character is already present, and its expression is not manually locked. The proposal changes only that expression; it does not add a character, select an outfit, move a scene, or initiate generation.

Changing the character ID to an unknown ID or changing the evidence excerpt to text absent from the source must cause structural/evidence validation to reject the whole proposal. A matching quote is not by itself proof of correct interpretation; ambiguous semantic cases still require the conservative rules and human evaluation in the parent specification.
