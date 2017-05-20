var component = require( "ractive/lib/component" );
var fs = require( "fs-plus" );
var path = require( "path" );
var glob = require( "glob" );
let files = glob.sync( "**/components/*.html" );

for ( var i = 0; i < files.length; i ++ ) {
	let file = files[i];
	console.log("- Compiled ", file);
	compile( file );
}

console.log("- Build completed successfully.");

function compile( file ) {
	let content = fs.readFileSync( file, "utf-8" );
	component.build( content, { escapeUnicode: true }, readFile ).then( str => {
		writeFile( file, str );
	} );
}

function writeFile( file, str ) {

	let index = file.indexOf( "." );
	let name = file.substr( 0, index );
	name = name.substr( name.indexOf( "/" ) + 1 );

	let target = path.join( "lib", name ) + ".js";

	fs.writeFileSync( target, str, "utf-8" );
}

function readFile( name ) {
	let content = fs.readFileSync( path.resolve( process.cwd(), name ), { encoding: 'utf8' } );
	return Promise.resolve( content );
}
