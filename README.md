# Inline validation rules

Micro tool (3kb) inspired by inline styles, ships bunch of validation rules attachable to form like a inline styles.

## Install

```html
<script src="https://cdn.jsdelivr.net/gh/kobylinski/validate-rules@v0.1.6/validate-rules.min.js"></script>
```

## Usage

```html
<div data-rules="required:!empty;valid:email">
	<label for="email">Email address</label>
	<input type="text" id="email" placeholder="Email">
	<label for="email" class="err err-required">Missing email</label>
	<label for="email" class="err err-valid">Invalid email</label>
</div>
```

```js
const form = document.getElementsByTagName('form')[0];
const validator = new ValidateRules( form );

form.addEventListener('submit', function(e){
	validator.validate() || e.preventDefault();
});
```

```css
label.err{
	display:none;
}
lebel.err.err-visible{
	display:block
}
```

Adding `data-rules` attribute you create scope. Each validation rule refers to validation message defined inside scope. One scope should contain only one form element. If you need to define validation rule based on multiple values, you should export value from scope (defining id attribute in scope tags) and use those ids in parent scope.

```html
<div data-rules="content:content(hello1)+' '+content(hello2);valid:!(valid(hello1)&&valid(hello2))||content=='hello world'">
	<div data-rules="required:!empty" id="hello1">
		<label for="hello1-field">Type "hello"</label>
		<input type="text" id="hello1-field" placeholder="...">
		<label for="hello1-field" class="err err-required">Missing value</label>
	</div>
	<div data-rules="required:!empty" id="hello2">
		<label for="hello2-field">Type "world"</label>
		<input type="text" id="hello2-field" placeholder="...">
		<label for="hello2-field" class="err err-required">Missing value</label>
	</div>
	<label for="email" class="err err-valid">Invalid value</label>
</div>

```

Directive `content` create value based on two fields used in other tests.



