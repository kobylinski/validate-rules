(function (root, factory) {
    if (typeof define === 'function' && define.amd) { define([], factory); } 
    else if (typeof exports === 'object') { module.exports = factory(); } 
    else { root.ValidateRules = factory(); }
}(this, function() {

	//--------------------------------------------------------------------------------------------
	// Form
	var scope = (function(){

		var defopts = {
			attribute: 'data-rules'
		};

		var add = function($, el){
			$.rules['' == el.id ? $.id() : el.id] = new scope.Context(el, $);
		};

		var ValidateRules = function(form, options){
			var counter = 0;
			this.id 	= function(){ return counter++; }; 
			this.form 	= form;
	    	this.rules 	= {};
	    	this.opts 	= Object.assign({}, defopts, options);
	    	this.init();
		};

		ValidateRules.prototype = {
			init: function(){
		    	var elements = this.$('['+this.opts.attribute+']'), i;
		    	for(i=0;i<elements.length;i++) add(this, elements[i]);
		    	for(i in this.rules) this.rules[i].setup();
			},
			values: function(){
				var values = [], i;
				for(i in this.rules) values.push(this.rules[i].content());
				return values;
			},
			validate: function(){
				var result = true, i;
				for(i in this.rules) result = this.rules[i].validate() && result;
				return result;
			},
			$: function(selector){ return this.form.querySelectorAll(selector); },
			$$: function(selector){ return this.form.querySelector(selector); }
		}

		return ValidateRules;
	})();

	//--------------------------------------------------------------------------------------------
	// Property functions
	scope.funcs = {
		value: function(processor){
			var query = processor.selector();
			if(null === query) return function(){ return processor.context.element().value; };
			else return function(){ return processor.context.$$(query).value; };
		},
		content: function(processor){
			var id = processor.args(function(){ return processor.id(); });
			if(null === id) return function(){ return processor.context.content(); };
			else return function(){ return processor.context.form.rules[id].content(); };
		
		},
		empty: function(processor){
			var query = processor.selector();
			if(null === query)
				return function(){
					return processor.context.content() == ''; 
				};
			return function(){
				var el = processor.context.$$(query);	
				if(['checkbox', 'radio'].indexOf(el.type)){
					return el.checked;
				}
				return el.value == ''
			}
		},
		valid: function(processor){
			var id = processor.args(function(){ return processor.id(); });
			if(null === id) throw "Parse error: <id> required";
			return function(){ return true === processor.context.form.rules[id].check(); }
		}
	}

	//--------------------------------------------------------------------------------------------
	// Scope properties
	scope.props = {
		element: {
			self: function(){
				return function(context){
					context.element = function(){ 
						if(['input','select', 'textarea'].indexOf(context.root.tagName.toLowerCase()) != -1)
							return context.root;
						return context.$$('input,select,textarea'); 
					}
				}
			},
			query: function(processor){
				var selector = processor.selector();
				if(null === selector) throw "Parse error: <missing selector>";
				return function(context){
					context.element = function(){ return context.$$(selector); };
				}
			}
		},
		content: function(processor){
			return function(context){
				context.content = processor.expression.parse();
			}
		},
	};

	//--------------------------------------------------------------------------------------------
	// Context
	scope.Context = (function(){

		var defopts = {
			element: 	scope.props.element.self(),
			content: 	function(context){
				var type = context.element().type;
				if(type){
					switch(context.element().type){
						case 'radio':
						case 'checkbox':
							context.content = function(){
								return context.element().checked ? 'on' : '';
							};
							return;
					}
				}
				context.content = function(){
					return context.element().value;
				}
			}
		};

	    var Context = function(root, form){
	    	this.form 		= form;
	    	this.root 		= root;
	    	this.content 	= null;
	    	this.tests		= {};
	    	this.opts 		= Object.assign({}, defopts);
	    	this.parse();

	    };

	    Context.prototype = {

	    	// parse definition
	    	parse: function(){
	    		this.processor = new scope.Processor(this);
	    		this.processor.parse();
	    	},

	    	definition: function(){
	    		return this.root.getAttribute(this.form.opts.attribute)
	    	},

	    	// setup
	    	setup: function(){
	    		for(var i in this.opts) { if(this.opts[i].call) this.opts[i](this); }
	    	},

	    	validate: function(){
	    		var label;
	    		this.reset();
	    		if(true !== (label = this.check())){
	    			this.alert(label);
	    			return false;
	    		}
	    		return true;
	    	},

	    	check: function(){
	    		for(var i in this.tests){
	    			if(this.tests[i].call){
	    				if(true !== this.tests[i]()){
		    				return i;
		    			}	
	    			}
	    		}

	    		return true;
	    	},

	    	alert: function(label){
	    		var el = this.root.querySelector('label.err-'+label);
	    		if(null !== el){
	    			el.classList.add('err-visible');
	    		}
	    	},

	    	reset: function(){
	    		var el = this.root.querySelectorAll('label.err-visible');
	    		for(var i=0;i<el.length;i++){
	    			el[i].classList.remove('err-visible');
	    		}
	    	},
	    	$: function(selector){ return this.root.querySelectorAll(selector); },
			$$: function(selector){ return this.root.querySelector(selector); }
	    };

	    return Context;
	})();

	//--------------------------------------------------------------------------------------------
	// Expression
	scope.Expression = (function(){
		var factory = function(fn, count){
		    return function(operators, values){
		        operators.shift();
		        values.unshift(fn.apply(null,values.splice(0, count)));
		    }
		};

		var operators = {
			'(':    [10, 70, function(operators, values){ }],
	        '!':    [20, 20, factory(function(a){     return function(){ return !a()          }}, 1)],
	      	'*':    [30, 30, factory(function(a,b){   return function(){ return a() * b();    }}, 2)],
	      	'/':    [30, 30, factory(function(a,b){   return function(){ return a() / b();    }}, 2)],
	      	'+': 	[40, 40, factory(function(a,b){   return function(){ return a() + b();    }}, 2)],
	        '-':   	[40, 40, function(operators, values){   
	        			operators[0] = '+'; 
	        			values.unshift(function(a){ return function(a){ return -a(); }; })(values.shift());   
	        		}],
	        '==':   [50, 50, factory(function(a,b){   return function(){ return a() == b();   }}, 2)],
	        '||':   [60, 60, factory(function(a,b){   return function(){ return a() || b();   }}, 2)],
	        '&&':   [60, 60, factory(function(a,b){   return function(){ return a() && b();   }}, 2)],
	        ')':    [70, 10, function(operators, values){ operators.splice(0,2); }]
		}

		var Expression = function(processor){
			this.processor = processor;
			this.lexer 	= processor.lexer;
		};

		Expression.prototype = {
			parse: function(){
				var token = null, 
					end=false, 
					ops=[], 
					val=[],
					safe=50,
					op = function(i,name){
						var name = name || ops[0];
						if(operators[name]){
							if(typeof i !== 'undefined'){
								if(operators[name][i]){ return operators[name][i]; }
								return false;
							} return true;
						} return false;
					};

				do{
					if(null === token && !end){
						token = this.lexer.next();
						if(null === token || token.value == ';'){ token = null; end = true; }
						else{
							switch(token.type){
								case scope.Lexer.IDENTIFIER:
									if(!scope.funcs[token.value])
										throw "Parse error: unknown function <"+token.value+">";
									val.unshift(scope.funcs[token.value](this.processor));
									token = null; continue;
								case scope.Lexer.QUOTE:
								case scope.Lexer.NUMBER:
									val.unshift((function(value){ 
										return function(){ return value;}; 
									})(token.value));
									token = null; continue;
							}
						}
					}

					if(null !== token && (!op() || (op(1) >= op(0, token.value)))){
						ops.unshift(token.value);
						token = null; continue;
					}
					op(2)(ops, val);
				}while(ops.length || !end);
				return val[0];
			}
		};

		return Expression;
	})();

	//--------------------------------------------------------------------------------------------
	// Processor

	scope.Processor = (function(){
		var Processor = function(context){
			this.context 	= context;
			this.lexer 		= new scope.Lexer(context.definition());
			this.expression = new scope.Expression(this);
		};

		Processor.prototype = {
			parse: function(){
				var token, value;
				while(null != (value = this.property())){
					if(scope.props[value]){	
						if(scope.props[value].call){
							this.context.opts[value] = scope.props[value](this);
						}else{
							this.context.opts[value] = scope.props[value][this.id()](this);
						}
					}else{
						this.context.tests[value] = this.expression.parse();
					}
				}
			},
			skip: function(){
				do{ var token = this.lexer.token(); }
				while(null !== token && ';' !== token.value);
			},
			selector: function(){
				return this.args(function(){
					return this.lexer.with('space', function(){
						var token, depth = 0, result = '';
						do{
							token = this.lexer.next();
							switch(token.value){
								case '(': depth++ ? result += '(': 0; break;
								case ')': --depth ? result += '(': 0; break;
								case null: return result;
								default:
									result += token.value;
									break;
							}
						}while(depth);
						return result;
					}.bind(this));	
				}.bind(this));
				return null;				
			},
			id: function(){
				return this.lexer.with('dash', function(){
					var token = this.lexer.next();
					if(null === token)
					if(token.type != scope.Lexer.IDENTIFIER)
						throw "Parse error: IDENTIFIER expected";
					return token.value;
				}.bind(this));
			},
			property: function(){
				if(this.lexer.end()) return null;
				var name = this.id();
				if(this.lexer.next().value != ':') 
					throw "Parse error: ':' expected.";
				return name;
			},
			args: function(fn){
				if(this.lexer.read() !== '(') return null;
				this.lexer.pos++;
				var result = fn();
				if(this.lexer.read() !== ')') throw "Parse error: ')' expected";
				this.lexer.pos++;
				return result; 
			}
		}

		return Processor;
	})();

	//--------------------------------------------------------------------------------------------
	// Lexer
	scope.Lexer = (function(){
	    var Lexer = function(value){
	        this.setup(value);
	    };
	    
	    Lexer.OPERATOR      = 1;
	    Lexer.IDENTIFIER    = 2;
	    Lexer.QUOTE         = 3;
	    Lexer.NUMBER        = 4;
	    Lexer.WHITESPACE    = 5;
	    
	    var token = function(type, value, pos){
	        return {
	            type:   type,
	            value:  value,
	            pos:    pos
	        }
	    };
	    
	    var ops = {
	        s: function($){ return token(Lexer.OPERATOR, $.read(), $.pos++); },
	        d: function(accept){
	            return function($){
	                var c = $.read(), n = $.read(1);
	                if(accept.indexOf(n) != -1){ c = c+n; $.pos++; }
	                return token(Lexer.OPERATOR, c, $.pos++);
	            }
	        }
	    };
	    ops.avail = {
	        '+':  ops.d(['+']),   '-':  ops.d(['-']),       '*':  ops.s,
	        '.':  ops.s,          '\\': ops.s,              ':':  ops.s,
	        '%':  ops.s,          '|':  ops.d(['|']),       '!':  ops.s,
	        '?':  ops.s,          '#':  ops.s,              '&':  ops.d(['&']),
	        ';':  ops.s,          ',':  ops.s,              '(':  ops.s,
	        ')':  ops.s,          '<':  ops.d(['=']),       '>':  ops.d(['=']),
	        '{':  ops.s,          '}':  ops.s,              '[':  ops.s,
	        ']':  ops.s,          '=':  ops.d(['='])
	    }
	    
	    var withSpace = '\n\t\r '.split(''),
	        withoutSpace = '\n\t\r'.split(''),
	        whitespace = function($){ return $.space ? withoutSpace : withSpace; },
	        skip = function($){
	            while($.pos < $.len){
	                if(whitespace($).indexOf($.read()) == -1) return;
	                $.pos++;
	            }
	        };
	    
	    var test = {
	        n: function(c){ return c >= '0' && c<= '9'; },
	        q: function(c){ return c === '"' || c === "'"; },
	        c: function(c){ return function(cc){ return c == cc }},
	        v: function(c){ return c==='_'||c==='$'; },
	        a: function(c){ return c>='a'&&c<='z'||c>='A'&&c<='Z' || test.v(c); },
	        w: function(c){ return c===' '||c==='\t'; },
	        an: function(dash){ return function(c){ return test.n(c) || test.a(c) || ( dash ? c=='-' : false ); }},
	        with: function($, test){
	            var offset = 1, c;
	            while('' !== (c = $.read(offset)) && test(c)) offset++;
	            return $.chunk(offset);
	        }
	    }
	    
	    Lexer.prototype = {
	        setup: function(value){
	            this.pos        = 0; 
	            this.exp        = null;
	            this.to         = null;
	            this.space      = false;
	            this.dash		= false;
	            this.buf        = typeof value !== 'undefined' ? value : null;
	            this.len        = null !== this.buf ? this.buf.length : 0;
	        },
	        next: function(){
	            skip(this);
	            if(this.end()) return null;
	            var c = this.read(), chunk;
	            switch(true){
	                case test.n(c):
	                    chunk = test.with(this, test.n);
	                    if(this.read() === '.'){
	                        this.pos++;
	                        chunk += '.'.test.with(this, test.n);
	                        return token(Lexer.NUMBER, parseFloat(chunk), this.pos);
	                    }
	                    return token(Lexer.NUMBER, parseInt(chunk), this.pos);
	                case test.q(c):
	                    var offset = 1;
	                    while('' !== (c = this.read(offset)) && !test.q(c)){ offset++; }
	                    return token(Lexer.QUOTE, this.chunk(offset-1, 1), this.pos++);
	                case test.a(c):
	                    chunk = test.with(this, test.an(this.dash));
	                    return token(Lexer.IDENTIFIER, chunk, this.pos);
	                case test.w(c):
	                    chunk = test.with(this, test.w);
	                    return token(Lexer.IDENTIFIER, chunk, this.pos);
	                default:
	                    if(ops.avail[c]){
	                        return ops.avail[c](this);
	                    }
	            }
	            
	            throw "Parse error";
	        },
	        end: 	function(){ return this.pos >= this.len; },
	        read: 	function(offset){ return this.buf.charAt(this.pos + (offset | 0)); },
	        chunk: 	function(to, skip){
	            var string = this.buf.substr(this.pos + (skip | 0), to);
	            this.pos += to; return string;
	        },
	        with: function(option, fn){
	        	this[option] = true; var result = fn(); this[option] = false;
	        	return result
	        },
	        to: function(char){
	        	var offset = 1, c;
	        	while(char !== (c = this.read(offset))){ offset++; }
	        	return this.chunk(offset-1, 1);
	        }
	    }
	    
	    return Lexer;
	})();


	return scope;
}));