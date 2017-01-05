(function (root, factory) {
    if (typeof define === 'function' && define.amd) { define([], factory); } 
    else if (typeof exports === 'object') { module.exports = factory(); } 
    else { root.FormRules = factory(); }
}(this, function() {
    "use strict";

    // tools
    var 
    	tagName	 	= function(element){ return element.tagName.toLowerCase(); },
    	validCnt 	= function(element){ return -1 === ['input', 'select', 'img'].indexOf(tagName(element)); },
    	validInput 	= function(element){ return -1 < ['input', 'select', 'textarea'].indexOf(tagName(element)); };


    // lexer constants
    var c = {
	 	PLUS: 			1,
		MINUS: 			2,
		MULTIPLY: 		3,
		PERIOD: 		4,
		BACKSLASH:		5,
		COLON: 			6,
		PERCENT: 		7,
		PIPE: 			8,
		DOUBLE_PIPE: 	9,
		EXCLAMATION: 	10,
		QUESTION: 		11,
		POUND: 			12,
		AMP: 			13,
		DOUBLE_AMP: 	14,
		SEMI:  			15,
		SEMI_VALUE: 	';',
		COMMA: 			16,
		L_PAREN: 		17,
		L_PAREN_VALUE: 	'(',	
		R_PAREN: 		18,
		R_PAREN_VALUE: 	')',
		L_ANG: 			19,
		R_ANG: 			20,
		L_BRACE: 		21,
		R_BRACE: 		22,
		L_BRACKET: 		23,
		R_BRACKET: 		24,
		EQUALS: 		25,
		DIVIDE: 		26,
		COMMENT: 		27,
		IDENTIFIER: 	28,
		NUMBER: 		29,
		QUOTE: 			30,
		SPACE: 			31
    };

    // Main class
    var FormRules = function(el){
    	this.form = el;
    	this.rules = [];
    	this.named = {};
    	this.init();
    };

	FormRules.prototype = {
		init: function(){
	    	var elements = this.form.querySelectorAll('[data-rules]'), i;
	    	for(i=0;i<elements.length;i++){
	    		this.rules.push(
	    			new scope.Context( elements[i], this )
    			);
	    	}

	    	for(i=0;i<this.rules.length;i++){
	    		this.rules[i].setup();
	    	}
		},

		values: function(){
			var values = [], i;
			for(i=0; i< this.rules.length; i++){
				values.push(this.rules[i].content());
			}

			return values;
		},

		validate: function(){
			var result = true, i;
			for(i=0; i< this.rules.length; i++){
				result = this.rules[i].validate() && result;
			}
			return result;
		}
	}

    var scope = FormRules;
    scope.c = c;

    // ----------------------------------------------------------------------------------------
    scope.functions = {
    	value: function(processor){
    		var selector = processor.selector();
			return function(context){
				switch(selector){
					case 'self':
						return function(){
							return context.element.value;
						};
					default:
						var element = context.container.querySelector(selector);
						if(null === element){ throw "Invalid CSS selector of element"; }
	    				if(!validInput(element)){ throw "Invalid context element"; }
						return function(){
							return element.value;
						};
				}
			};
    	},
    	checked: function(processor){
    		var selector = processor.selector();
    		return function(context){
    			var elements = context.container.querySelectorAll(selector);
    			return function(){
    				var checked = false, i;
    				for(i=0;i<elements.length;i++){
    					checked = checked || elements[i].checked
    				}

    				return checked ? 'on' : '';
    			};
    		}
    	}
    };

    // ----------------------------------------------------------------------------------------
    // Definitions
    scope.config = {

    	// 1. Container
    	container: {		
	    	self: function(){ 
	    		return function(context){
		    		if(!validCnt(context.root)){ throw "Invalid context container"; }
		    		context.container = context.root; 
	    		}
	    	},
	    	parent: function(){ 
	    		return function(context){
	    			context.container = context.root.parentNode; 
	    		}
	    	},
	    	query: function(processor){
	    		var selector = processor.selector();
	    		return function(context){
	    			var element = context.form.querySelector(selector);
	    			if(null === element){ throw "Invalid CSS selector of container"; }
	    			if(!validCnt(element)){ throw "Invalid context container"; }
		    		context.container = element;
		    	}
	    	}
    	},

    	// 2. Context Id 
    	id: function(processor){
			var token = processor.safe();
			if(c.IDENTIFIER === token.name || c.QUOTE === token.name){
				return function(context){
					context.id = token.value;
					context.form.named[context.id] = context;
				};
			}

			if(c.SEMI_VALUE !== processor.next()){
				throw "Parse error: \";\" expected";
			}
		},

		// 3. Form input element
		element: {
			self: function(){
				return function(context){
					context.element = function(){
						if(!validInput(context.root)) { throw "Invalid context element" }
						return context.root;
					}
				}
			},
			query: function(processor){
				var selector = processor.selector();
				return function(context){
					context.element = function(){
						var element = query(selector);
						if(null === element){ throw "Invalid CSS selector of element"; }
		    			if(!validInput(element)){ throw "Invalid context element"; }
			    		return element;		
					}
				}
			}
		},

		// 5. Value
		content: function(processor){
			var expr =  processor.stringExpr({
				value: scope.functions.value,
				checked: scope.functions.checked
			});

			return function(context){
				for(var i=0;i<expr.length;i++){
					if(expr[i].call) {
						expr[i] = expr[i](context);
					}else if(typeof expr[i] == 'string'){
						expr[i] = function(){ return this; }.bind(expr[i]);
					}
				}
				context.content = function(){
					var buffer = "", i;
					for(i=0;i<expr.length;i++){
						buffer += expr[i]();
					}
					return buffer;
				}
			}
		},

		mandatory: {
			required: function(){
				return function(context){
					return function(){
						return context.content().trim() !== '' ? true : 'required';
					}
				}
			},
			optional: false
		}
    };

	// ---------------------------------------------------------------------------------------
    // Element context
    scope.Context = function(root, form){
    	this.container 	= null;
    	this.form 		= form;
    	this.root 		= root;
    	this.element 	= null;
    	this.id 		= null;
    	this.content 	= null;
    	this.rules 		= [];
    	this.definition	= root.getAttribute('data-rules');
    	this.processor 	= null;
    	this.init 		= {
    		container: 	scope.config.container.parent(),
    		element: 	scope.config.element.self(),
    		content: 	function(context){ 
    			context.content = function() {
    				return context.element().value;
				}
    		},
    		rules: []
    	};
    	this.parse();
    };

    scope.Context.prototype = {

    	// parse definition
    	parse: function(){
    		this.processor = new scope.Processor(this);
    		this.processor.parse();
    	},

    	// setup
    	setup: function(){
    		for(var initiator in this.init){
    			if(this.init[initiator].call){
    				this.init[initiator](this);
    			}
    		}

    		for(var i=0;i<this.init.rules.length;i++){
    			this.rules.push(this.init.rules[i](this));
    		}
    	},

    	validate: function(){
    		var label;
    		this.reset();
    		for(var i=0;i<this.rules.length;i++){
    			if(true !== (label = this.rules[i]())){
    				this.alert(label);
    				return false;
    			}
    		}	

    		return true;
    	},

    	alert: function(label){
    		var el = this.container.querySelector('label.err-'+label);
    		if(null !== el){
    			el.classList.add('err-visible');
    		}
    	},

    	reset: function(){
    		var el = this.container.querySelectorAll('label.err-visible');
    		for(var i=0;i<el.length;i++){
    			el[i].classList.remove('err-visible');
    		}
    	}
    };

    // Processor
	scope.Processor = function(context){
		this.lexer 		= new scope.Lexer();
		this.context 	= context;
	};

	scope.Processor.prototype = {
		parse: function(){
			this.lexer.input(this.context.definition);
			var token, value;
			while('' != (value = this.combine([c.IDENTIFIER, c.MINUS], c.COLON))){
				if(scope.config[value]){
					if(this.context.init[value]){
						if(scope.config[value].call){
							this.context.init[value] = scope.config[value](this);
						}else{
							var valueToken = this.configToken(scope.config[value]);
							if(false !== valueToken){
								this.context.init[value] = scope.config[value][valueToken](this);
							}
						}
					}else{
						if(scope.config[value].call){
							var rule = scope.config[value](this);
							if(false !== rule){
								this.context.init.rules.push(rule);
							}
						}else{
							var valueToken = this.configToken(scope.config[value]);
							if(false !== valueToken){
								var rule = scope.config[value][valueToken](this);
								if(false !== rule){
									this.context.init.rules.push(rule);
								}
							}
						}
					}
				}else{
					this.skipToSemi();
				}
			}
		},

		combine: function(accept, to){
			var value = '', token;
			while(null !== (token = this.lexer.token())){
				if(to == token.name) return value;
				if(-1 !== accept.indexOf(token.name) ){
					value += token.value;
				}
			}

			return value;
		},

		configToken: function(scope){
			var value = this.combine([c.IDENTIFIER, c.MINUS], c.SEMI);
			if(!scope[value]) throw "Parse error: unexpected value \""+value+"\"";
			if(!scope[value].call) return false;
			return value;
		},
		skipToSemi: function(){
			do{
				var token = this.lexer.token();
			}while(null !== token && c.SEMI !== token.name);
		},

		safe: function(){
			var token = this.lexer.token();
			if(null === token){
				throw "Parse error: unexpected end of string";
			}

			return token;
		},

		func: function(scope, token){
			if( c.IDENTIFIER === token.name && scope[token.value] ){
				return scope[token.value](this);
			}

			throw "Parse error: invalid function name \""+token.value+"\"";
		},

		funcArgs: function(){
			var token, depth = 0, buffer = [];
			
			if(c.L_PAREN !== this.safe().name){
				throw "Parse error: \"(\" expected";
			}
			
			while(!(c.R_PAREN === (token = this.safe()).name && 0 === depth)){
				if(c.L_PAREN === token.name){ depth++; }
				if(c.R_PAREN === token.name){ depth--; }
				buffer.push(token);
			}

			return buffer;
		},

		selector: function(){
			this.lexer.skipSpace = false;
			var args = this.funcArgs(), i, selector = '';
			this.lexer.skipSpace = true;
			for(i=0;i<args.length;i++){
				selector += args[i].value;
			}

			return selector;
		},

		stringExpr: function(scope){
			var token, buffer = [];
			while(!this.lexer.eos() && c.SEMI !== (token = this.safe()).name){
				switch(token.name){
					case c.IDENTIFIER:
						if(c.L_PAREN_VALUE === this.lexer.next()){
							buffer.push(this.func(scope, token));
						}
						break;
					case c.QUOTE:
						buffer.push(token.value);
				}
			}

			return buffer;
		}
	};


    // Lexer
    scope.Lexer = (function(opts, tools){
    	var Lexer = function(){
    		this.pos 		= 0;
			this.buf 		= null;
			this.buflen 	= 0;
			this.skipSpace 	= true; 
    	}

    	Lexer.prototype = {
    		input: function(value){
    			this.pos = 0;
				this.buf = value;
				this.buflen = value.length;
    		},
    		token: function(value){
    			tools.skip(this);
				if (this.eos()) {
				    return null;
				}
				var c = this.buf.charAt(this.pos);
				if (c === '/') {
					var next_c = this.next();
					if (next_c === '/') {
						return tools.cm(this);
					} else {
						return {name: c.DIVIDE, value: '/', pos: this.pos++};
					}
				} else {
					var op = opts[c];
					if (op !== undefined) {
						if(op === c.AMP || op === c.PIPE){
							var next_c = this.next();
							if(next_c === c){
								if(op === c.AMP){
									return {name: c.DOUBLE_AMP, value: c+next_c, pos: this.pos++};
								}
								if(op === c.PIPE){
									return {name: c.DOUBLE_PIPE, value: c+next_c, pos: this.pos++};	
								}
							}
						}

						return {name: op, value: c, pos: this.pos++};
					} else {
						if (tools.isA(c)) {
							return tools.id(this);
						} else if (tools.isDg(c)) {
							return tools.num(this);
						} else if (c === '"' || "'") {
							return tools.quot(this, c);
						} else {
							throw Error('Token error at ' + this.pos);
						}
					}
				}
    		},
    		next: function(){
    			return this.buf.charAt(this.pos);
    		},
    		eos: function(){
    			return this.pos >= this.buflen;
    		}
    	}

    	return Lexer;
    })({
	 	'+':  c.PLUS,
		'-':  c.MINUS,
		'*':  c.MULTIPLY,
		'.':  c.PERIOD,
		'\\': c.BACKSLASH,
		':':  c.COLON,
		'%':  c.PERCENT,
		'|':  c.PIPE,
		'!':  c.EXCLAMATION,
		'?':  c.QUESTION,
		'#':  c.POUND,
		'&':  c.AMPERSAND,
		';':  c.SEMI,
		',':  c.COMMA,
		'(':  c.L_PAREN,
		')':  c.R_PAREN,
		'<':  c.L_ANG,
		'>':  c.R_ANG,
		'{':  c.L_BRACE,
		'}':  c.R_BRACE,
		'[':  c.L_BRACKET,
		']':  c.R_BRACKET,
		'=':  c.EQUALS,
		' ':  c.SPACE
	},{
		isNl:function(c){return c==='\r'||c==='\n';},
		isDg:function(c){return c>='0'&&c<='9';},
		isA:function(c){return (c>='a'&&c<='z')||(c>='A'&&c<='Z')||c==='_'||c==='$';},
		isAN:function(c){return(c>='a'&&c<='z')||(c>='A'&&c<='Z')||(c>='0'&&c<='9')||c==='_'||c==='$';},
		skip:function(lexer){
			while (lexer.pos < lexer.buflen) {
				var c = lexer.buf.charAt(lexer.pos);
				if ( (lexer.skipSpace && c == ' ') || c == '\t' || c == '\r' || c == '\n') {
					lexer.pos++;
				} else {
					break;
				}
			}
		},
		cm: function(lexer) {
			var endpos = lexer.pos + 2;
			var c = lexer.buf.charAt(lexer.pos + 2);
			while (endpos < lexer.buflen && !this.isNl(lexer.buf.charAt(endpos))) {
				endpos++;
			}

			var tok = {
				name: c.COMMENT,
				value: lexer.buf.substring(lexer.pos, endpos),
				pos: lexer.pos
			};

			lexer.pos = endpos + 1;
  			return tok;
		},
		id: function(lexer) {
			var endpos = lexer.pos + 1;
			while (endpos < lexer.buflen &&
				this.isAN(lexer.buf.charAt(endpos))) {
				endpos++;
			}

			var tok = {
				name: c.IDENTIFIER,
				value: lexer.buf.substring(lexer.pos, endpos),
				pos: lexer.pos
			};

			lexer.pos = endpos;
			return tok;
		},
		num: function(lexer) {
			var endpos = lexer.pos + 1;
			while (endpos < lexer.buflen &&
				this.isDg(lexer.buf.charAt(endpos))) {
				endpos++;
			}

			var tok = {
				name: c.NUMBER,
				value: lexer.buf.substring(lexer.pos, endpos),
				pos: lexer.pos
			};

			lexer.pos = endpos;
			return tok;
		},
		quot: function(lexer, char) {
			var end_index = lexer.buf.indexOf(char, lexer.pos + 1);
			if (end_index === -1) {
				throw Error('Unterminated quote at ' + lexer.pos);
			} else {
				var tok = {
					name: c.QUOTE,
					value: lexer.buf.substring(lexer.pos+1, end_index),
					pos: lexer.pos
				};

				lexer.pos = end_index + 1;
				return tok;
			}
		}
	});	

	return scope;
}));
