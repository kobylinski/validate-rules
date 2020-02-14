# Inline validation rules

Inspired by inline styles, ships bunch of validation rules attachable to form like a inline styles.

```html
<div class="form-group" data-rules="required:!empty;valid:email">
	<label for="email">Email address</label>
	<input type="text" class="form-control" id="email" placeholder="Email">
	<label for="email" class="help-block err err-required">Missing email</label>
	<label for="email" class="help-block err err-valid">Invalid email</label>
</div>
```

```js
const validator = new ValidateRules(
	document.getElementsByTagName('form')[0]
);

form.addEventListener('submit', function(e){
	e.preventDefault()
	validator.validate();
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
<div class="row" data-rules="
	content:content(hello1)+' '+content(hello2);
	valid:!(valid(hello1)&&valid(hello2))||content=='hello world'
">
	<div class="col-xs-6">
  		<div class="form-group" data-rules="required:!empty" id="hello1">
    		<label for="hello1-field">Type "hello"</label>
    		<input type="text" class="form-control" id="hello1-field" placeholder="...">
    		<label for="hello1-field" class="help-block err err-required">Missing value</label>
  		</div>
	</div>
	<div class="col-xs-6">
  		<div class="form-group" data-rules="required:!empty" id="hello2">
    		<label for="hello2-field">Type "world"</label>
    		<input type="text" class="form-control" id="hello2-field" placeholder="...">
    		<label for="hello2-field" class="help-block err err-required">Missing value</label>
  		</div>
	</div>
	<div class="col-xs-12">
  		<label for="email" class="help-block err err-valid">Invalid value</label>
	</div>
</div>

```





