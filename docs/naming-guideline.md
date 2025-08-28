<h2 id="naming">Naming</h2>

<h3 id="naming-rules-common-to-all-identifiers">6.1 Rules common to all identifiers</h3>

<p>Identifiers use only ASCII letters and digits, and, in a small number of cases
noted below, underscores and very rarely (when required by frameworks like
Angular) dollar signs.</p>

<p>Give as descriptive a name as possible, within reason. Do not worry about saving
horizontal space as it is far more important to make your code immediately
understandable by a new reader. Do not use abbreviations that are ambiguous or
unfamiliar to readers outside your project, and do not abbreviate by deleting
letters within a word.</p>

<pre><code class="language-js prettyprint good">errorCount          // No abbreviation.
dnsConnectionIndex  // Most people know what "DNS" stands for.
referrerUrl         // Ditto for "URL".
customerId          // "Id" is both ubiquitous and unlikely to be misunderstood.
</code></pre>

<p>Disallowed:</p>

<pre><code class="language-js prettyprint bad">n                   // Meaningless.
nErr                // Ambiguous abbreviation.
nCompConns          // Ambiguous abbreviation.
wgcConnections      // Only your group knows what this stands for.
pcReader            // Lots of things can be abbreviated "pc".
cstmrId             // Deletes internal letters.
kSecondsPerDay      // Do not use Hungarian notation.
</code></pre>

<p><strong>Exception</strong>: Variables that are in scope for 10 lines or fewer, including
arguments that are <em>not</em> part of an exported API, <em>may</em> use short (e.g. single
letter) variable names.</p>

<h3 id="naming-rules-by-identifier-type">6.2 Rules by identifier type</h3>

<h4 id="naming-package-names">6.2.1 Package names</h4>

<p>Package names are all <code>lowerCamelCase</code>. For example, <code>my.exampleCode.deepSpace</code>,
but not <code class="badcode">my.examplecode.deepspace</code> or
<code class="badcode">my.example_code.deep_space</code>.</p>

<p><strong>Exception</strong>: The package name may conform to TypeScript's path-based pattern. This is
typically all lower case with underscores where present in filenames.</p>

<h4 id="naming-class-names">6.2.2 Class names</h4>

<p>Class, interface, record, and typedef names are written in <code>UpperCamelCase</code>.
Unexported classes are simply locals: they are not marked <code>@private</code>.</p>

<p>Type names are typically nouns or noun phrases. For example, <code>Request</code>,
<code>ImmutableView</code>, or <code>VisibilityMode</code>. Additionally, interface names may
sometimes be adjectives or adjective phrases instead (for example, <code>Readable</code>).</p>

<h4 id="naming-method-names">6.2.3 Method names</h4>

<p>Method names are written in <code>lowerCamelCase</code>. Names for <code>@private</code> methods may
optionally end with a trailing underscore.</p>

<p>Method names are typically verbs or verb phrases. For example, <code>sendMessage</code> or
<code>stop_</code>. Getter and setter methods for properties are never required, but if
they are used they should be named <code>getFoo</code> (or optionally <code>isFoo</code> or <code>hasFoo</code>
for booleans), or <code>setFoo(value)</code> for setters.</p>

<p>Underscores may also appear in JsUnit test method names to separate logical
components of the name. One typical pattern is
<code>test&lt;MethodUnderTest&gt;_&lt;state&gt;_&lt;expectedOutcome&gt;</code>, for example
<code>testPop_emptyStack_throws</code>. There is no One Correct Way to name test methods.</p>

<h4 id="naming-enum-names">6.2.4 Enum names</h4>

<p>Enum names are written in <code>UpperCamelCase</code>, similar to classes, and should
generally be singular nouns. Individual items within the enum are named in
<code>CONSTANT_CASE</code>.</p>

<h4 id="naming-constant-names">6.2.5 Constant names</h4>

<p>Constant names use <code>CONSTANT_CASE</code>: all uppercase letters, with words separated
by underscores. There is no reason for a constant to be named with a trailing
underscore, since private static properties can be replaced by (implicitly
private) module locals.</p>

<h5 id="naming-definition-of-constant">6.2.5.1 Definition of “constant”</h5>

<p>Every constant is a <code>@const</code> static property or a module-local <code>const</code>
declaration, but not all <code>@const</code> static properties and module-local <code>const</code>s
are constants. Before choosing constant case, consider whether the field really
feels like a <em>deeply immutable</em> constant. For example, if any of that instance's
observable state can change, it is almost certainly not a constant. Merely
intending to never mutate the object is generally not enough.</p>

<p>Examples:</p>

<pre><code class="language-js prettyprint good">// Constants
const NUMBER = 5;
/** @const */ exports.NAMES = goog.debug.freeze(['Ed', 'Ann']);
/** @enum */ exports.SomeEnum = { ENUM_CONSTANT: 'value' };

// Not constants
let letVariable = 'non-const';

class MyClass {
  constructor() { /** @const {string} */ this.nonStatic = 'non-static'; }
};
/** @type {string} */
MyClass.staticButMutable = 'not @const, can be reassigned';

const /** Set&lt;string&gt; */ mutableCollection = new Set();

const /** MyImmutableContainer&lt;SomeMutableType&gt; */ stillMutable =
    new MyImmutableContainer(mutableInner);

const {Foo} = goog.require('my.foo');  // mirrors imported name

const logger = log.getLogger('loggers.are.not.immutable');
</code></pre>

<p>Constants’ names are typically nouns or noun phrases.</p>

<h5 id="naming-local-aliases">6.2.5.2 Local aliases</h5>

<p>Local aliases should be used whenever they improve readability over
fully-qualified names. Follow the same rules as <code>goog.require</code>s
(<a href="#file-goog-require">??</a>), maintaining the last part of the aliased name.
Aliases may also be used within functions. Aliases must be <code>const</code>.</p>

<p>Examples:</p>

<pre><code class="language-js prettyprint good">const staticHelper = importedNamespace.staticHelper;
const CONSTANT_NAME = ImportedClass.CONSTANT_NAME;
const {assert, assertInstanceof} = asserts;
</code></pre>

<h4 id="naming-non-constant-field-names">6.2.6 Non-constant field names</h4>

<p>Non-constant field names (static or otherwise) are written in <code>lowerCamelCase</code>,
with an optional trailing underscore for private fields.</p>

<p>These names are typically nouns or noun phrases. For example, <code>computedValues</code>
or <code>index_</code>.</p>

<h4 id="naming-parameter-names">6.2.7 Parameter names</h4>

<p>Parameter names are written in <code>lowerCamelCase</code>. Note that this applies even if
the parameter expects a constructor.</p>

<p>One-character parameter names should not be used in public methods.</p>

<p><strong>Exception</strong>: When required by a third-party framework, parameter names may
begin with a <code>$</code>. This exception does not apply to any other identifiers (e.g.
local variables or properties).</p>

<h4 id="naming-local-variable-names">6.2.8 Local variable names</h4>

<p>Local variable names are written in <code>lowerCamelCase</code>, except for module-local
(top-level) constants, as described above. Constants in function scopes are
still named in <code>lowerCamelCase</code>. Note that <code>lowerCamelCase</code> is used
even if the variable holds a constructor.</p>

<h4 id="naming-template-parameter-names">6.2.9 Template parameter names</h4>

<p>Template parameter names should be concise, single-word or single-letter
identifiers, and must be all-caps, such as <code>TYPE</code> or <code>THIS</code>.</p>

<h4 id="naming-module-local-names">6.2.10 Module-local names</h4>

<p>Module-local names that are not exported are implicitly private. They are not
marked <code>@private</code>. This applies to classes, functions, variables, constants,
enums, and other module-local identifiers.</p>

<h3 id="naming-camel-case-defined">6.3 Camel case: defined</h3>

<p>Sometimes there is more than one reasonable way to convert an English phrase
into camel case, such as when acronyms or unusual constructs like <q>IPv6</q> or
<q>iOS</q> are present. To improve predictability, Google Style specifies the
following (nearly) deterministic scheme.</p>

<p>Beginning with the prose form of the name:</p>

<ol>
<li>Convert the phrase to plain ASCII and remove any apostrophes. For example,
<q>Müller's algorithm</q> might become <q>Muellers algorithm</q>.</li>
<li>Divide this result into words, splitting on spaces and any remaining
punctuation (typically hyphens).
<ol>
<li>Recommended: if any word already has a conventional camel case
appearance in common usage, split this into its constituent parts (e.g.,
<q>AdWords</q> becomes <q>ad words</q>). Note that a word such as <q>iOS</q> is not
really in camel case per se; it defies any convention, so this
recommendation does not apply.</li>
</ol></li>
<li>Now lowercase everything (including acronyms), then uppercase only the first
character of:
<ol>
<li>… each word, to yield <code>UpperCamelCase</code>, or</li>
<li>… each word except the first, to yield <code>lowerCamelCase</code></li>
</ol></li>
<li>Finally, join all the words into a single identifier.</li>
</ol>

<p>Note that the casing of the original words is almost entirely disregarded.</p>

<p>Examples of <code>lowerCamelCase</code>:</p>

<table>
<thead>
<tr>
<th style="text-align: center">Prose form</th>
<th style="text-align: center">Correct</th>
<th style="text-align: center">Incorrect</th>
</tr>
</thead>

<tbody>
<tr>
<td style="text-align: center"><q>XML HTTP request</q></td>
<td style="text-align: center"><code>xmlHttpRequest</code></td>
<td style="text-align: center"><code>XMLHTTPRequest</code></td>
</tr>
<tr>
<td style="text-align: center"><q>new customer ID</q></td>
<td style="text-align: center"><code>newCustomerId</code></td>
<td style="text-align: center"><code>newCustomerID</code></td>
</tr>
<tr>
<td style="text-align: center"><q>inner stopwatch</q></td>
<td style="text-align: center"><code>innerStopwatch</code></td>
<td style="text-align: center"><code>innerStopWatch</code></td>
</tr>
<tr>
<td style="text-align: center"><q>supports IPv6 on iOS?</q></td>
<td style="text-align: center"><code>supportsIpv6OnIos</code></td>
<td style="text-align: center"><code>supportsIPv6OnIOS</code></td>
</tr>
<tr>
<td style="text-align: center"><q>YouTube importer</q></td>
<td style="text-align: center"><code>youTubeImporter</code></td>
<td style="text-align: center"><code>youtubeImporter</code>*</td>
</tr>
</tbody>
</table>

<p>*Acceptable, but not recommended.</p>

<p>For examples of <code>UpperCamelCase</code>, uppercase the first letter of each correct
<code>lowerCamelCase</code> example.</p>

<p>Note: Some words are ambiguously hyphenated in the English language: for example
<q>nonempty</q> and <q>non-empty</q> are both correct, so the method names <code>checkNonempty</code>
and <code>checkNonEmpty</code> are likewise both correct.</p>