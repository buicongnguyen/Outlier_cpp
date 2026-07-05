// Quiz bank for cpp-skills.html.
// Format: quizData.{lang,ood,arch} = [{ q, options: [[text, isCorrect]...], explain }]
// Extra formats: { type: "multi", ... } exact-set multi-select; { type: "order", steps: [...] } sequencing.
// level: "senior" tags senior/principal-tier questions.
const quizData = {
  lang: [
    {
      q: "std::string b = a; b += \"!\"; — what happened to a?",
      options: [
        ["Nothing — the assignment copied the whole string into an independent b (value semantics)", true],
        ["a now ends with '!' — b is a reference to a", false],
        ["a was moved-from and is now empty", false],
        ["It depends on whether a is on the stack or the heap", false]
      ],
      explain: "C++ classes have value semantics by default: 'std::string b = a;' invokes the copy constructor, giving b its own buffer. This is the opposite of Java/C# where class variables are references. To alias instead, you would write 'std::string& b = a;'; to transfer, 'std::string b = std::move(a);'. Value semantics is also why passing large objects by value costs a copy — hence const& parameters."
    },
    {
      q: "What is the key difference between a pointer (T*) and a reference (T&)?",
      options: [
        ["A pointer can be null and reseated to another object; a reference must be bound at creation, is never null, and always aliases that one object", true],
        ["References are slower because they add a level of indirection", false],
        ["Pointers can only address heap objects; references only stack objects", false],
        ["There is no difference — references are syntax sugar with identical rules", false]
      ],
      explain: "A reference is an alias: it must be initialized to an existing object, can never be null or re-bound, and has no arithmetic. A pointer is a value in its own right — nullable, reseatable, offsettable. Idiomatic use: references for parameters that must refer to something (const T& to read, T& to modify), non-owning raw pointers when 'optional' or 'reseatable' is genuinely needed."
    },
    {
      q: "A function returns 'const std::string&' referring to a local variable inside it. What is wrong?",
      options: [
        ["The local dies when the function returns, so the caller receives a dangling reference — using it is undefined behavior", true],
        ["Nothing — const references extend the lifetime of what they bind to", false],
        ["It fails to compile: locals cannot be returned by reference", false],
        ["It leaks memory because the local is never destroyed", false]
      ],
      explain: "Automatic (stack) objects are destroyed at scope exit; a reference to one becomes dangling the moment the function returns. Compilers warn on the direct case but miss indirect ones (returning a reference into a temporary, or a member of a local). Lifetime extension only applies to binding a temporary to a local const reference — not across a return. Fix: return by value; RVO/move makes that cheap."
    },
    {
      q: "What is RAII?",
      options: [
        ["Tying a resource to an object's lifetime: the constructor acquires it and the destructor releases it, so cleanup runs automatically on every exit path including exceptions", true],
        ["A memory pool allocation strategy for real-time systems", false],
        ["The rule that all resources must be allocated at program startup", false],
        ["A garbage-collection scheme the C++ runtime applies to smart pointers", false]
      ],
      explain: "Resource Acquisition Is Initialization is the central C++ idiom: lock_guard unlocks, fstream closes, unique_ptr deletes — in their destructors, which run deterministically at scope exit whether you return early, fall through, or throw. It is why C++ needs no finally block, and why exception-safe code in C++ is mostly a matter of using RAII types rather than writing try/catch."
    },
    {
      q: "What happens when you try to copy a std::unique_ptr: auto p2 = p1;?",
      options: [
        ["Compile error — unique_ptr's copy constructor is deleted; ownership can only be transferred with std::move", true],
        ["Both p2 and p1 point to the object, which is deleted when the first one dies", false],
        ["p2 receives a deep copy of the pointed-to object", false],
        ["It compiles but throws std::bad_alloc at runtime", false]
      ],
      explain: "unique_ptr models sole ownership, enforced at compile time: copying is deleted, moving transfers the pointer and nulls the source. 'auto p2 = std::move(p1);' hands the object to p2. This makes ownership visible in the type system — a function taking unique_ptr<T> by value is declaring 'I take ownership', and callers must explicitly move into it."
    },
    {
      q: "Two objects hold shared_ptr references to each other. What is the consequence?",
      options: [
        ["A reference cycle: their counts never reach zero, so neither is ever destroyed — break the cycle by making one side a weak_ptr", true],
        ["Nothing — shared_ptr detects cycles and collects them", false],
        ["A double free when the program exits", false],
        ["A compile error: mutually referential shared_ptrs are rejected", false]
      ],
      explain: "shared_ptr is reference counting, not garbage collection — it cannot see cycles. Parent and child each keeping the other alive means both leak. The standard fix: the back-edge (child→parent, observer→subject) becomes weak_ptr, which observes without owning; call lock() to get a temporary shared_ptr if the object is still alive. Design view: cycles usually signal unclear ownership — decide who owns whom."
    },
    {
      q: "What does std::move actually do?",
      options: [
        ["Nothing at runtime — it is a cast to rvalue reference that makes the object eligible for move construction/assignment", true],
        ["It copies the object to a new memory location and frees the old one", false],
        ["It immediately transfers the object's memory to the destination", false],
        ["It marks the object for the garbage collector", false]
      ],
      explain: "std::move moves nothing: it is static_cast<T&&>. The actual transfer happens only if the result initializes or assigns something with a move constructor/assignment — those steal the source's internals (buffer pointers) instead of copying. If the target type only has a copy constructor, a copy silently happens instead. The name describes intent, not action."
    },
    {
      q: "After 'std::string b = std::move(a);', what state is a in?",
      options: [
        ["Valid but unspecified — you may destroy it or assign it a new value, but should not rely on its current contents", true],
        ["Destroyed — any further use, including assignment, is undefined behavior", false],
        ["Guaranteed to be the empty string on all implementations by the standard", false],
        ["Unchanged — std::move copies", false]
      ],
      explain: "Standard-library types leave a moved-from object 'valid but unspecified': its invariants hold, so destruction and reassignment are safe, but its value is not to be read. In practice a moved-from string is usually empty, but relying on that is non-portable. clang-tidy's bugprone-use-after-move flags reads after a move — a common review catch."
    },
    {
      q: "Is returning a large std::vector by value from a function a performance problem?",
      options: [
        ["Usually not — copy elision (mandatory for prvalues since C++17) or a cheap move means no element-wise copy happens", true],
        ["Yes — always return large objects via output reference parameters", false],
        ["Yes — the vector is copied twice: once into a temporary and once into the caller", false],
        ["Only if the vector holds more than 4096 elements", false]
      ],
      explain: "Returning 'return result;' constructs the value directly in the caller's storage (RVO/guaranteed elision), or at worst moves — a few pointer swaps for vector. Output parameters obscure data flow, prevent const, and block composition for no gain. Return by value is the modern default; measure before deviating."
    },
    {
      q: "You hold an iterator into a std::vector and then push_back enough elements to exceed its capacity. What is the iterator's status?",
      options: [
        ["Invalidated — the vector reallocated its buffer, so the iterator points into freed memory; using it is undefined behavior", true],
        ["Still valid — iterators track elements, not addresses", false],
        ["Automatically updated to the element's new location", false],
        ["Valid for reading but not writing", false]
      ],
      explain: "vector stores elements contiguously; growing past capacity allocates a new buffer, moves elements, and frees the old one. Every iterator, pointer, and reference into the old buffer dangles. The same applies to modifying a vector inside a range-for over it. Defenses: reserve() up front, use indexes, or collect insertions and apply them after iteration. ASan catches the resulting use-after-free."
    },
    {
      q: "std::string_view sv = std::string(\"temp\") + \"x\"; — what is wrong with this line?",
      options: [
        ["sv views a temporary string that is destroyed at the end of the statement, leaving sv dangling immediately", true],
        ["Nothing — string_view copies the characters it is given", false],
        ["It fails to compile: string_view cannot be built from an expression", false],
        ["string_view adds a null terminator, corrupting the temporary", false]
      ],
      explain: "string_view is a non-owning pointer+length; it never copies. The temporary string here dies at the semicolon, and sv points into its freed buffer. The same bug hides in 'return sv_of_local', storing a string_view member built from a parameter, and view-typed map keys. Rule: string_view for parameters and short-lived locals; anything stored owns a std::string."
    },
    {
      q: "Why is 'const std::string& name' preferred over 'std::string name' for a read-only parameter?",
      options: [
        ["It avoids copying the argument while still accepting both lvalues and temporaries, and const prevents accidental modification", true],
        ["References are required for strings because strings cannot be copied", false],
        ["It allows the function to modify the caller's string safely", false],
        ["const& parameters are stored in read-only memory for speed", false]
      ],
      explain: "Pass-by-value copies (or moves) the argument; const& binds directly to the caller's object — no copy — and const documents/enforces read-only. Temporaries bind to const& too. Nuances: cheap types (int, pointers, string_view, span) pass by value; and a 'sink' parameter you intend to store is often taken by value then moved into place, letting callers choose copy or move."
    },
    {
      q: "auto x = getWidget(); where getWidget returns 'const Widget&'. What is x's type?",
      options: [
        ["Widget — plain auto drops references and top-level const, so x is a copy; write 'const auto&' to keep the reference", true],
        ["const Widget& — auto preserves the declared return type exactly", false],
        ["Widget* — auto decays references to pointers", false],
        ["It fails to compile because auto cannot bind to const", false]
      ],
      explain: "auto uses template-argument deduction: references and top-level const are stripped, so x is a fresh Widget copy-constructed from the return value. Often that is a silent performance bug (or a correctness one, if you intended to observe the original). 'auto&' / 'const auto&' preserve reference-ness; 'auto&&' is a forwarding reference that binds to anything."
    },
    {
      q: "A lambda captures a local variable by reference and is stored in a task queue to run later, after the enclosing function returns. What happens?",
      options: [
        ["The capture dangles — the lambda will read a destroyed variable when it runs: undefined behavior. Capture by value (or move) instead", true],
        ["The lambda keeps the variable alive until it runs", false],
        ["A compile error: by-reference captures cannot leave the scope", false],
        ["The runtime copies the variable when the scope exits", false]
      ],
      explain: "By-reference capture stores a reference to the stack variable — nothing extends its life, and the compiler cannot see that the lambda escapes. Once the function returns, running the lambda is use-after-scope (ASan: stack-use-after-return). Rules: escaping lambdas capture by value/move ([v = std::move(v)]); watch 'this' capture in async callbacks — [self = shared_from_this()] is the standard fix for object lifetime."
    },
    {
      q: "What is the main performance property of templates like std::sort compared to C's qsort?",
      options: [
        ["The comparator and element type are known at compile time, so calls are inlined and the code is specialized per type — no per-comparison function-pointer call", true],
        ["Templates run at compile time, so sorting costs nothing at runtime", false],
        ["std::sort uses a better algorithm, which is the entire difference", false],
        ["There is no difference; both compile to identical code", false]
      ],
      explain: "qsort dispatches every comparison through a function pointer on void* data; std::sort instantiates a version specialized for the element type and comparator, inlining the comparison into the sort loop. That is templates' deal: zero-cost abstraction at runtime, paid for in compile time, header exposure, and code size per instantiation."
    },
    {
      q: "What does 'undefined behavior' mean in C++?",
      options: [
        ["The standard places no requirements on the program's behavior — the optimizer may assume it never happens, so anything can result, including appearing to work", true],
        ["The program is guaranteed to crash with a diagnostic", false],
        ["The behavior differs between compilers but is documented by each", false],
        ["An exception of type std::undefined_error is thrown", false]
      ],
      explain: "UB (out-of-bounds access, signed overflow, dangling dereference, data races...) is a contract violation: the compiler optimizes assuming it never occurs, so violations can delete checks, fold branches, or work fine for years and break on a compiler upgrade. 'Documented per compiler' describes implementation-defined behavior — a different, tamer category. Sanitizers exist to catch UB while it still looks like a bug."
    },
    {
      q: "int x; if (x > 0) ... — what is the state of x at the if?",
      options: [
        ["Indeterminate — locals of built-in type are not zero-initialized, and reading the garbage value is undefined behavior", true],
        ["Zero — C++ zero-initializes all variables", false],
        ["Zero in debug builds, garbage in release builds, by rule", false],
        ["Whatever the previous stack frame left, which is guaranteed readable", false]
      ],
      explain: "Automatic variables of built-in type get no default initialization; reading one before assignment is UB (and a classic 'works in debug, fails in release' source, since debug stacks are often conveniently zeroed — but that is luck, not a rule). Fixes: initialize at declaration, use brace-init ('int x{};' is zero), and compile with -Wuninitialized / run MSan."
    },
    {
      q: "What does constexpr on a function enable?",
      options: [
        ["The function can be evaluated at compile time when given constant arguments — usable in array sizes, template arguments, and static_assert", true],
        ["The function is guaranteed to be inlined at every call site", false],
        ["The function becomes thread-safe", false],
        ["The function can only be called at compile time, never at runtime", false]
      ],
      explain: "constexpr functions run at compile time in constant-expression contexts and remain ordinary functions at runtime otherwise. This moves work out of the binary: lookup tables, sizes, parsing of fixed inputs, validation via static_assert. It neither forces inlining nor restricts runtime use ('consteval' does the latter). Modern C++ keeps expanding what is allowed inside constexpr."
    },
    {
      q: "Why is std::make_unique<Widget>() preferred over std::unique_ptr<Widget>(new Widget())?",
      options: [
        ["It is exception-safe in complex expressions, avoids naming new at all, and states ownership intent in one step", true],
        ["make_unique allocates from a faster memory pool", false],
        ["The new-based form leaks even on the happy path", false],
        ["make_unique enables the object to be copied", false]
      ],
      explain: "Historically 'f(unique_ptr<W>(new W), mayThrow())' could leak if evaluation interleaved (fixed in C++17, but the style point stands). make_unique keeps 'new' out of application code entirely, which makes owning raw pointers grep-detectable code smells. make_shared adds a real optimization: one allocation for object + control block."
    },
    {
      q: "T x{narrowingValue}; — what does brace initialization give you over T x = narrowingValue;?",
      options: [
        ["Braces reject narrowing conversions at compile time (e.g., double to int, long to short), and value-initialize when empty", true],
        ["Braces are only valid for aggregates and arrays", false],
        ["Braces skip the constructor for speed", false],
        ["Nothing — the two forms are always identical", false]
      ],
      explain: "Brace-init makes 'int x{3.7};' a compile error where 'int x = 3.7;' silently truncates — narrowing bugs caught for free. 'T x{};' value-initializes (zero for built-ins). One trap: for containers, braces mean initializer_list — std::vector<int> v{10} is one element 10, while v(10) is ten zeros."
    },
    {
      q: "During stack unwinding after a throw, what runs?",
      options: [
        ["Destructors of all automatic objects in the frames being unwound — which is why RAII types make exception safety largely automatic", true],
        ["Nothing — memory is reclaimed but no code runs until the catch", false],
        ["Only destructors of objects declared in the try block itself", false],
        ["The terminate handler, unless the exception is caught in the same function", false]
      ],
      explain: "Unwinding destroys each frame's locals in reverse order: locks release, files close, unique_ptrs delete. Code holding resources in raw form (a naked new before the throw point) leaks — the core argument for RAII. Related rules: catch by const&; a destructor that itself throws during unwinding calls std::terminate."
    },
    {
      q: "What is the practical guidance for choosing how to pass a parameter the function will STORE (a sink parameter)?",
      options: [
        ["Take it by value and std::move it into place — callers with lvalues pay one copy, callers with temporaries pay only moves", true],
        ["Always take const& and copy inside, which is never worse", false],
        ["Always take T&& to force callers to move", false],
        ["Take a raw pointer so no copies ever occur", false]
      ],
      explain: "For 'void setName(std::string n) { name_ = std::move(n); }' a caller passing a temporary or moved lvalue costs two moves and zero copies; const&-then-copy always costs a full copy even from temporaries. T&& only accepts rvalues, forcing callers to std::move everything. By-value-then-move is the simple, near-optimal default for sinks; overload pairs or perfect forwarding are optimizations for hot paths."
    },
    {
      level: "senior",
      q: "The optimizer removed your 'if (p == nullptr) return;' guard. Investigation shows p was dereferenced a few lines BEFORE the check. Why is the removal legal?",
      options: [
        ["Dereferencing p is UB if p is null, so the compiler may assume p is non-null from that point on — making the later null check provably dead code", true],
        ["A compiler bug — null checks may never be optimized away", false],
        ["The check was removed because pointers are always non-null in optimized builds", false],
        ["The CPU's branch predictor eliminated the branch, not the compiler", false]
      ],
      explain: "This is UB-based optimization in action: the dereference is a promise that p is non-null (else the program has no defined meaning), so subsequent null checks fold to false. Identical logic deletes overflow checks written as 'if (x + 1 < x)' for signed x. The fix is ordering: validate before use. UBSan and clang-tidy catch several of these patterns; this class of bug is why 'it worked before the compiler upgrade' is a UB smell, not a compiler regression."
    },
    {
      level: "senior",
      q: "A service crashes intermittently in release builds only; debug builds are clean. Stack traces point to different locations each time. What is the most productive first move?",
      options: [
        ["Run the test suite and a repro workload under AddressSanitizer and UBSan — the symptoms suggest memory corruption or UB whose effects surface only under optimization", true],
        ["Ship the debug build to production since it does not crash", false],
        ["Add try/catch around the crashing functions to contain the fault", false],
        ["Lower the optimization level permanently and close the issue", false]
      ],
      explain: "Random-location release-only crashes are the signature of UB: uninitialized reads, out-of-bounds writes corrupting neighbors, use-after-free, or data races — all reshaped by the optimizer. Sanitizers report the root cause at the first bad access with allocation/free stacks, instead of the downstream victim. Catching or de-optimizing hides the symptom and leaves corruption in place; neither is a fix."
    },
    {
      type: "multi",
      q: "Which of these operations can invalidate iterators/pointers into a std::vector? Select ALL that apply.",
      options: [
        ["push_back when size() == capacity()", true],
        ["insert or erase in the middle (for iterators at or after the point)", true],
        ["clear()", true],
        ["Calling size() or empty()", false],
        ["Reading an element via operator[]", false]
      ],
      explain: "Reallocation (growth past capacity) invalidates everything; erase/insert invalidate from the modification point onward even without reallocation; clear destroys all elements. Read-only operations invalidate nothing. Honorable mention: reserve() invalidates if it actually grows the buffer — which is exactly why calling it BEFORE taking iterators is the defensive idiom."
    },
    {
      type: "multi",
      q: "Which of the following are undefined behavior in C++? Select ALL that apply.",
      options: [
        ["Signed integer overflow (INT_MAX + 1)", true],
        ["Reading v[v.size()] on a std::vector via operator[]", true],
        ["Two threads writing the same int without synchronization", true],
        ["Unsigned integer wraparound (0u - 1)", false],
        ["Destroying a moved-from std::string", false]
      ],
      explain: "Signed overflow, out-of-bounds access (operator[] does not check; at() throws), and data races are all UB — the optimizer may assume they never happen. Unsigned arithmetic is defined to wrap modulo 2^N (that is why it hides bugs rather than causing UB). Moved-from standard objects are valid-but-unspecified: destroying or assigning them is perfectly fine."
    },
    {
      level: "senior",
      type: "multi",
      q: "Which of these uses of std::string_view are safe? Select ALL that apply.",
      options: [
        ["A function parameter 'void print(std::string_view s)' used only during the call", true],
        ["A local view over a named std::string that outlives every use of the view", true],
        ["A class member string_view initialized from a std::string constructor parameter", false],
        ["Returning a string_view over a std::string local to the function", false],
        ["Storing string_views into a container after the source strings were destroyed", false]
      ],
      explain: "string_view is safe exactly when the viewed characters outlive the view: parameters (caller's string lives across the call) and short-lived locals qualify. Members are the trap: the constructor parameter dies after construction, leaving the member dangling — members own (std::string). Returning a view of a local and outliving the source are the same lifetime bug in different clothes."
    },
    {
      type: "order",
      q: "A throw expression executes deep in a call stack. Put the steps in the order they happen.",
      steps: [
        "The exception object is constructed (copied/moved from the throw operand)",
        "Stack unwinding begins: each frame's automatic objects are destroyed in reverse declaration order",
        "Unwinding stops at the first frame with a matching catch clause",
        "The handler runs, binding the exception (idiomatically by const reference)",
        "Leaving the handler destroys the exception object and execution continues after the try/catch"
      ],
      explain: "The exception object lives outside the unwound frames. Unwinding runs destructors — RAII types release their resources here, which is what makes exception safety composable. If no matching handler exists, std::terminate is called; if a destructor throws during unwinding, likewise."
    },
    {
      level: "senior",
      type: "order",
      q: "Trace the ownership of an object created by a factory through to its destruction, using unique_ptr. Order the steps.",
      steps: [
        "The factory constructs the object with std::make_unique<Impl>() and returns the unique_ptr by value",
        "The caller receives ownership via move — no copy of the object occurs",
        "The caller moves the pointer into a class member, transferring ownership to the object it belongs to",
        "The owning object is eventually destroyed, running its members' destructors",
        "The unique_ptr member's destructor deletes the Impl exactly once"
      ],
      explain: "This is the standard modern ownership chain: one owner at every instant, transfers explicit via move, destruction automatic and single. Nobody writes delete; there is nothing to forget on early returns or exceptions. Contrast raw-pointer factories, where every caller must remember who deletes."
    },
    {
      level: "senior",
      type: "order",
      q: "AddressSanitizer reports 'heap-use-after-free' in production-adjacent testing. Order a disciplined diagnosis-and-fix workflow.",
      steps: [
        "Reproduce under an ASan build so the report is deterministic and complete",
        "Read all three stacks in the report: the bad access, where the memory was freed, and where it was allocated",
        "Identify the object and the two disagreeing owners/lifetimes those stacks imply",
        "Fix the ownership design — e.g., a smart pointer or explicit lifetime contract — rather than just reordering the free",
        "Add a regression test and keep the suite running under ASan in CI"
      ],
      explain: "ASan's three stacks (use, free, allocation) turn use-after-free from a heisenbug into a readable story: two parts of the code disagreed about who owned the object and for how long. Patching the symptom (moving the free) leaves the disagreement in place; encoding ownership in types removes the bug class."
    },
    {
      type: "code",
      q: "This setter stores its sink parameter. Which expression completes it best?",
      code: "class User {\n  std::string name_;\npublic:\n  void setName(std::string n) {\n    name_ = ____;\n  }\n};",
      options: [
        ["std::move(n)", true],
        ["n  (compiles, but pays an unnecessary extra copy)", false],
        ["&n", false],
        ["n.release()", false]
      ],
      explain: "The by-value-then-move sink idiom: n is the function's own copy (or was move-constructed from a temporary), so its guts can be stolen — 'name_ = std::move(n);' is a cheap pointer swap. Plain 'n' copies the buffer a second time. '&n' assigns a pointer to a string (compile error), and std::string has no release()."
    },
    {
      type: "code",
      q: "The loop must not copy each (large) element and must not modify them. Which declaration completes it?",
      code: "std::vector<BigRecord> records = load();\nfor (____ rec : records) {\n  process(rec);\n}",
      options: [
        ["const auto&", true],
        ["auto  (copies every element)", false],
        ["auto*", false],
        ["const auto  (still copies every element)", false]
      ],
      explain: "Range-for declares a fresh variable per element: plain 'auto' (with or without const) copy-constructs every BigRecord — a silent performance bug. 'const auto&' binds directly to each element, no copy, read-only. 'auto*' does not compile (elements are objects, not pointers). For mutation you would use 'auto&'."
    },
    {
      type: "code",
      q: "The callback outlives this function — it runs later from a task queue. Which capture is correct?",
      code: "void schedule(TaskQueue& q) {\n  std::string payload = buildPayload();\n  q.push([____] { send(payload); });\n}  // returns before the task runs",
      options: [
        ["payload  (capture by value — the lambda owns a copy)", true],
        ["&payload  (dangles: the local dies when schedule returns)", false],
        ["&  (same dangling reference, spelled implicitly)", false],
        ["  (empty capture list)", false]
      ],
      explain: "The lambda escapes the scope, so by-reference captures dangle — stack-use-after-return, UB the moment the task runs. Capturing by value copies payload into the closure, which owns it for as long as the task lives; 'payload = std::move(payload)' would avoid even that copy. An empty capture list does not compile here (payload is used inside)."
    },
    {
      type: "code",
      q: "The goal is a vector containing ten zero-valued ints. Which initializer is correct?",
      code: "std::vector<int> v____;\nassert(v.size() == 10 && v[0] == 0);",
      options: [
        ["(10)", true],
        ["{10}  (one element with value 10)", false],
        ["[10]", false],
        ["= 10", false]
      ],
      explain: "For containers, braces mean initializer_list: {10} builds a one-element vector holding 10 — the assert fails on size(). Parentheses select the count constructor: (10) gives ten value-initialized (zero) ints. This paren-vs-brace trap is specific to types with initializer_list constructors; for most other types braces are the safer default."
    }
  ],
  ood: [
    {
      q: "Animal* a = new Dog; a->speak(); — speak() is virtual and Dog overrides it. Which version runs, and why?",
      options: [
        ["Dog::speak — virtual calls dispatch through the object's vtable, so the runtime (dynamic) type decides", true],
        ["Animal::speak — the pointer's static type decides", false],
        ["Both run: Animal's first, then Dog's", false],
        ["It is unspecified which one runs", false]
      ],
      explain: "A virtual call compiles to an indirect call through the hidden vptr stored in the object, which points at the Dog vtable. That is runtime polymorphism: callers written against Animal work with types that did not exist when they were compiled. A non-virtual method would resolve at compile time from the static type (Animal). This only works through pointers/references — a by-value Animal has been sliced."
    },
    {
      q: "A base class has a NON-virtual destructor. What happens on 'delete basePtr;' where basePtr points to a derived object?",
      options: [
        ["Undefined behavior — in practice only the base destructor runs, so the derived part's resources leak", true],
        ["Both destructors run, but in the wrong order", false],
        ["A compile error: deleting through a base pointer requires a virtual destructor", false],
        ["The runtime detects the derived type and calls the right destructor anyway", false]
      ],
      explain: "Destruction through a base pointer with a non-virtual destructor is UB; typically the derived destructor never runs, leaking its members. Rule: a class meant to be deleted polymorphically declares 'virtual ~Base() = default;'. Alternatively, a protected non-virtual destructor makes polymorphic delete a compile error while still allowing use as an interface."
    },
    {
      q: "void render(Shape s); is called with a Circle. What happens?",
      options: [
        ["Object slicing — only the Shape sub-object is copied into s; Circle's data is lost and virtual calls inside resolve to Shape's versions", true],
        ["The Circle is copied intact and behaves as a Circle inside", false],
        ["A compile error: derived types cannot bind to base parameters", false],
        ["A std::bad_cast is thrown at runtime", false]
      ],
      explain: "Pass-by-value constructs a brand-new Shape from the Circle's base part — the radius is gone and s's vptr is Shape's. No warning, silently wrong rendering. Polymorphic types travel by Shape&, const Shape&, Shape*, or unique_ptr<Shape>. Making the base abstract, or deleting its copy operations, turns accidental slicing into a compile error."
    },
    {
      q: "What does declaring 'virtual void draw() = 0;' do to a class?",
      options: [
        ["Makes it abstract: it cannot be instantiated, and concrete derived classes must override draw()", true],
        ["Makes draw() do nothing when called", false],
        ["Deletes the function so no class may implement it", false],
        ["Initializes the function pointer to null, causing a crash if called", false]
      ],
      explain: "A pure virtual function renders the class abstract. A class of only pure virtuals plus a virtual destructor is the C++ interface idiom. Derived classes that fail to override every pure virtual remain abstract themselves. (A pure virtual MAY still have an out-of-line definition callable as Base::draw().)"
    },
    {
      q: "Why should every intended override be marked with the 'override' keyword?",
      options: [
        ["The compiler verifies a matching virtual base function exists — signature typos become errors instead of silently creating an unrelated new function", true],
        ["It makes the function run faster by devirtualizing it", false],
        ["It is required by the language for the override to take effect", false],
        ["It prevents further overriding in more-derived classes", false]
      ],
      explain: "Without 'override', 'void draw(int) const' with the wrong constness or parameter list quietly declares a NEW function that overrides nothing — callers through the base keep getting the base version. 'override' turns that into a compile error. ('final' is the keyword that stops further overriding; devirtualization is an optimizer concern.)"
    },
    {
      q: "What is the 'rule of zero'?",
      options: [
        ["Write no destructor, copy, or move operations at all — let RAII members (string, vector, unique_ptr) define correct copying and destruction automatically", true],
        ["Classes should have zero public data members", false],
        ["Every class must zero-initialize its members", false],
        ["Constructors should take zero arguments", false]
      ],
      explain: "If every member manages itself, the compiler-generated special members compose them correctly — copy copies, move moves, destructor destroys, all for free. Classes needing custom versions are exactly those touching raw resources; the modern move is to wrap the raw resource once (a small RAII handle class obeying the rule of five) so everything above returns to zero."
    },
    {
      q: "You wrote a destructor that releases a raw resource (say, close(fd_)). What does the rule of three/five now demand?",
      options: [
        ["Also define or delete the copy constructor and copy assignment (and the two move operations) — the compiler defaults would copy the handle and double-close it", true],
        ["Nothing — the destructor alone is sufficient", false],
        ["Only a default constructor", false],
        ["Make the destructor virtual", false]
      ],
      explain: "A hand-written destructor signals manual resource management, and the compiler's memberwise copy is then wrong: two objects owning one fd, closed twice. Either implement copy (dup the handle) and move (steal it, null the source, noexcept) — all five — or '= delete' copying to make misuse a compile error. Better still: wrap fd in a RAII type and return to the rule of zero."
    },
    {
      q: "Declaring a copy constructor (even '= default') has what side effect on move operations?",
      options: [
        ["The implicit move constructor and move assignment are NOT generated — copies silently happen where moves were expected", true],
        ["Moves are also generated automatically to match", false],
        ["The class becomes move-only", false],
        ["No effect; moves are always generated", false]
      ],
      explain: "Declaring any copy operation (or a destructor) suppresses implicit move generation; std::move on such a type quietly degrades to a copy — correct but slow, and invisible without profiling or clang-tidy. If you declare one special member, decide about all five explicitly ('= default' the moves). Yet another argument for the rule of zero."
    },
    {
      q: "How is an 'interface' idiomatically expressed in C++?",
      options: [
        ["An abstract class containing only pure virtual functions plus a virtual (or protected) destructor", true],
        ["A class marked with the interface keyword", false],
        ["A header file containing only free-function declarations", false],
        ["Any class that has at least one virtual function", false]
      ],
      explain: "C++ has no interface keyword; the idiom is 'struct Logger { virtual void log(std::string_view) = 0; virtual ~Logger() = default; };'. Consumers depend on Logger&, implementations derive and override. The destructor detail matters the moment ownership is polymorphic. Compile-time alternatives (templates/concepts) express the same contract without vtables when runtime substitution is not needed."
    },
    {
      q: "Why does deep implementation inheritance earn the name 'fragile base class problem'?",
      options: [
        ["Derived classes silently depend on base implementation details — a seemingly safe base change (calling one virtual from another, reordering) breaks children the base author cannot see", true],
        ["Base classes are stored in fragile memory regions", false],
        ["C++ limits inheritance depth to three levels", false],
        ["Virtual dispatch gets slower with each inheritance level", false]
      ],
      explain: "Inheritance couples a child to the parent's implementation, not just its interface: self-calls, call order, and state invariants all become de-facto contract. Composition contains the same functionality behind an explicit interface, so internals can change freely. Inherit for genuine is-a with a stable dispatch contract; otherwise contain and delegate."
    },
    {
      q: "A ReportGenerator class computes figures, formats HTML, and emails the result. Which principle is violated and what is the fix?",
      options: [
        ["Single Responsibility — three reasons to change in one class; split into computation, formatting, and delivery components composed together", true],
        ["Liskov Substitution — it must be split into a class hierarchy", false],
        ["Open/Closed — it should be marked final", false],
        ["Nothing, as long as the methods are private", false]
      ],
      explain: "SRP is about change pressure: finance changes the figures, design changes the HTML, ops changes the email — all landing in one class that everyone edits and everyone can break. Three small classes (or two classes and an interface for delivery) isolate the axes, shrink tests, and make ownership clear. The 'and' in the class description is the tell."
    },
    {
      q: "A switch over an enum of payment providers keeps growing a new case per provider, edited inside tested code each time. Which principle addresses this, and how?",
      options: [
        ["Open/Closed — define a PaymentProvider interface and one implementation per provider; new providers are new classes plugged in, and the switch disappears", true],
        ["Interface Segregation — split the enum into several smaller enums", false],
        ["Dependency Inversion — move the switch into a factory and it stops counting", false],
        ["Single Responsibility — each case should call a separate function", false]
      ],
      explain: "OCP: extend with new code instead of modifying tested code. The variation axis (provider behavior) becomes an abstraction; each provider is a class; the only remaining switch-like code is one registration/factory site. Judgment call: a stable three-case switch is fine — reach for OCP when the case list demonstrably keeps growing. For closed sets, std::variant + std::visit is the type-safe alternative."
    },
    {
      q: "class Square : public Rectangle overrides setWidth to also change height (keeping it square). Callers that resize Rectangles start failing on Squares. Which principle is violated?",
      options: [
        ["Liskov Substitution — Square changes Rectangle's behavioral contract (setWidth must not alter height), so it is not substitutable despite the is-a intuition", true],
        ["Encapsulation — width and height should be private", false],
        ["Open/Closed — Rectangle should have been final", false],
        ["Dependency Inversion — callers should depend on an IShape", false]
      ],
      explain: "LSP is about contracts, not taxonomy: code written against Rectangle assumes independent width/height; Square breaks that postcondition, so substituting it corrupts caller logic. Mathematical is-a does not survive mutability. Fixes: separate types behind a common read-only interface, or immutable value types where 'resize' returns a new object. Same smell: a derived override that throws 'not supported'."
    },
    {
      q: "An IMachine interface declares print(), scan(), and fax(); the basic printer must stub scan() and fax() with 'not supported'. Which principle is violated?",
      options: [
        ["Interface Segregation — split into IPrinter, IScanner, IFax so implementers take only what they support and clients depend only on what they use", true],
        ["Single Responsibility — the printer class does too much", false],
        ["Open/Closed — the interface cannot be extended", false],
        ["Rule of five — the interface lacks special members", false]
      ],
      explain: "Fat interfaces force lying implementations, and every 'not supported' stub is a latent LSP violation waiting for a caller that trusted the interface. Small role-interfaces compose: the multifunction device implements all three; clients needing printing take IPrinter& and remain testable with a tiny fake."
    },
    {
      q: "OrderService directly constructs and calls StripeClient. What does the Dependency Inversion Principle prescribe?",
      options: [
        ["OrderService depends on an abstract PaymentGateway interface it (or its layer) owns; StripeGateway implements it, and main() injects the concrete instance", true],
        ["OrderService should inherit from StripeClient to reuse its code", false],
        ["StripeClient should be a singleton so construction happens once", false],
        ["OrderService should read the payment provider from a config file", false]
      ],
      explain: "High-level policy (orders) must not depend on low-level detail (Stripe's SDK); both depend on an abstraction. In C++ that is a pure-virtual PaymentGateway; OrderService takes PaymentGateway& in its constructor. Tests inject FakeGateway with no framework or patching; swapping providers touches one wiring site in main(). The abstraction belongs to the caller's layer — that ownership direction is the 'inversion'."
    },
    {
      q: "How is dependency injection typically done in C++ without a framework?",
      options: [
        ["Constructor parameters: take Interface& (non-owning) or unique_ptr<Interface> (owning); main() constructs the graph and wires it — the compiler enforces completeness", true],
        ["A global service-locator singleton that any class queries at runtime", false],
        ["Preprocessor macros that swap class names per build", false],
        ["It requires a DI container library; manual injection does not scale", false]
      ],
      explain: "Plain constructor injection covers almost every real case: dependencies are visible in the signature, the object is valid once constructed, and a missing dependency is a compile error rather than a runtime container exception. Service locators hide dependencies and defeat testability. Reference vs unique_ptr encodes the ownership decision right in the API."
    },
    {
      q: "Why should single-argument constructors generally be marked 'explicit'?",
      options: [
        ["To block implicit conversions — otherwise passing an int where a Meters is expected silently constructs a Meters, hiding unit and type bugs", true],
        ["explicit constructors run faster", false],
        ["The language requires explicit on all constructors since C++17", false],
        ["To prevent the class from being copied", false]
      ],
      explain: "Without explicit, 'void advance(Meters d); advance(5);' compiles — 5 of what? Implicit converting constructors let wrong-but-convertible arguments flow through APIs unnoticed (bool/pointer conversions are notorious). Mark single-arg constructors explicit by default; leave implicit only deliberate conversions (e.g., string from literal) where the convenience is the point."
    },
    {
      q: "What is CRTP (class Derived : public Base<Derived>) used for?",
      options: [
        ["Static polymorphism: the base calls derived methods resolved at compile time — no vtable, fully inlinable — at the cost of no runtime substitution", true],
        ["Creating recursive data structures like linked lists", false],
        ["Guaranteeing a class can never be inherited from", false],
        ["Enabling a class to inherit from itself for memoization", false]
      ],
      explain: "The base template knows the derived type at compile time and casts this to Derived* to call its methods — template-method pattern without virtual dispatch. Used for mixins (operator sets, counters, intrusive containers) and hot paths where a vtable call matters. Tradeoffs: every derived is a distinct type (no common container), errors are template-flavored, and C++23 'deducing this' now covers several classic CRTP uses more simply."
    },
    {
      q: "When is std::function<R(Args)> the right tool versus an interface class?",
      options: [
        ["When the dependency is a single callable — it accepts lambdas, free functions, and functors without a hierarchy, at the cost of type erasure overhead", true],
        ["Never — std::function is deprecated in modern C++", false],
        ["Whenever maximum performance is needed, since it always inlines", false],
        ["Only for signals between threads", false]
      ],
      explain: "A one-method interface is often just a callable: 'std::function<bool(const Order&)> approver' beats defining IApprover and three implementing classes, and tests pass lambdas inline. Costs: possible heap allocation for large captures and an indirect call (never inlined). Multi-method contracts, or cases needing identity/state inspection, still want a real interface; hot inner loops may want a template parameter instead."
    },
    {
      q: "What problem does the PIMPL idiom (pointer to implementation) solve?",
      options: [
        ["The public header exposes only a unique_ptr<Impl>; private members live in the .cpp — cutting compile-time coupling and keeping the class's ABI stable as internals change", true],
        ["It makes the class polymorphic without virtual functions", false],
        ["It eliminates heap allocation for class members", false],
        ["It allows two classes to share private members", false]
      ],
      explain: "In C++, private members are still in the header: every change recompiles all users, and layout changes break ABI. PIMPL moves the real members into an Impl struct defined in the .cpp; the header holds one opaque pointer. Costs: one allocation and one indirection per object, and the destructor must be defined in the .cpp (where Impl is complete). Standard practice at shared-library boundaries."
    },
    {
      q: "For a value type like Money, what does C++20's 'auto operator<=>(const Money&) const = default;' give you?",
      options: [
        ["All six comparison operators, generated consistently by memberwise comparison, replacing six hand-written and drift-prone overloads", true],
        ["Only equality; ordering must still be written by hand", false],
        ["A hash function usable in unordered_map", false],
        ["Implicit conversion to bool for use in if statements", false]
      ],
      explain: "The defaulted spaceship compares members in declaration order and synthesizes <, <=, >, >=, ==, != — one line, no inconsistency bugs (the classic: someone updates == but not <). Hand-write it only when semantic order differs from member order (e.g., compare normalized values). Hashing remains separate: specialize std::hash if the type keys an unordered container."
    },
    {
      level: "senior",
      q: "Your team ships libcore.so consumed by other teams' binaries. A developer adds one private data member to an exported class. API is unchanged and everything compiles. What is the risk?",
      options: [
        ["ABI breakage — the class's size and layout changed, so already-compiled consumers allocating or embedding it corrupt memory until they rebuild; PIMPL or interface-only boundaries prevent this class of break", true],
        ["None — private members cannot affect other binaries", false],
        ["Only a performance regression from the larger object", false],
        ["The dynamic linker will refuse to load the library, failing safely", false]
      ],
      explain: "Consumers compiled against the old header baked in the old sizeof and member offsets; the new .so disagrees, and the failure is silent corruption, not a clean load error. This is why 'it compiles' says nothing about ABI. Boundary discipline: PIMPL classes, pure-virtual interfaces created by factory functions, or C APIs — each keeps layout out of the contract. Semantic versioning and ABI-diff tooling (abi-compliance-checker) guard the rest."
    },
    {
      level: "senior",
      q: "You are designing image-processing filters. Set A: filters chosen per-request at runtime from user config. Set B: a fixed pixel-format conversion applied in the innermost loop. What dispatch do you pick for each?",
      options: [
        ["A: virtual interface (runtime substitution, one container of mixed filters). B: template parameter (inlined into the loop, zero dispatch overhead)", true],
        ["Both virtual — consistency matters more than performance", false],
        ["Both templates — virtual functions are obsolete in modern C++", false],
        ["A: templates, B: virtual — templates handle runtime choice better", false]
      ],
      explain: "The deciding question: when is the type known? User config resolves at runtime, so you need runtime polymorphism (vector<unique_ptr<Filter>>, stable .cpp code, negligible per-image call cost). The inner-loop conversion is known at compile time and runs per-pixel: a template parameter (or CRTP) inlines it, enabling vectorization; a virtual call per pixel would dominate the profile. Mixed designs are normal: virtual at the architecture scale, templates in the hot core."
    },
    {
      level: "senior",
      q: "A codebase passes shared_ptr<T> to nearly every function 'to be safe'. What is the principled critique?",
      options: [
        ["Ownership is a design decision being dodged: most callees only USE the object (take T& or const T&); shared_ptr everywhere hides who owns what, adds atomic ref-count traffic, and invites cycles and lifetime surprises", true],
        ["None — shared_ptr is the recommended default for all parameters", false],
        ["shared_ptr should be replaced by raw new/delete for performance", false],
        ["The only problem is verbosity; semantics are unaffected", false]
      ],
      explain: "Smart-pointer parameters should express an ownership claim: unique_ptr by value = 'I take ownership'; shared_ptr by value = 'I retain shared ownership beyond this call' (rare); plain T&/const T& = 'I just use it' (the overwhelming majority). Blanket shared_ptr makes every lifetime everyone's problem — nobody can say when anything dies — and each copy costs contended atomic increments. Core Guidelines R.30/F.7 codify this: pass smart pointers only to manipulate lifetime."
    },
    {
      type: "multi",
      q: "Which statements about virtual functions in C++ are true? Select ALL that apply.",
      options: [
        ["Dispatch uses the object's dynamic type when called through a pointer or reference", true],
        ["Constructors cannot be virtual", true],
        ["A virtual call made inside a constructor dispatches to the class under construction, not the eventual derived class", true],
        ["static member functions can be virtual", false],
        ["Marking a function virtual guarantees it will never be inlined", false]
      ],
      explain: "The vptr is set in stages during construction, so ctor-time virtual calls see the currently-constructing class — a notorious surprise (never call virtuals from constructors expecting derived behavior). Constructors and statics cannot be virtual (no object/vptr to dispatch through yet). Devirtualization: when the compiler proves the dynamic type (final, local objects), it may inline virtual calls."
    },
    {
      level: "senior",
      type: "multi",
      q: "Which of these derived-class behaviors violate the Liskov Substitution Principle? Select ALL that apply.",
      options: [
        ["Overriding a method to throw NotSupported for an operation the base contract promises", true],
        ["Requiring a stricter precondition than the base (rejecting inputs the base accepts)", true],
        ["Returning results that break the base's documented postcondition (e.g., an unsorted result from a 'returns sorted' method)", true],
        ["Overriding with a faster algorithm that honors the same contract", false],
        ["Adding new public methods that the base does not have", false]
      ],
      explain: "LSP is contract algebra: a substitutable subtype may weaken preconditions and strengthen postconditions, never the reverse. Throwing where the base promised success, demanding stricter inputs, or delivering weaker guarantees all break callers written against the base. Faster-same-contract implementations and additional capabilities are exactly what subtyping is FOR."
    },
    {
      type: "multi",
      q: "Which of these are reasonable C++ implementations of the strategy pattern? Select ALL that apply.",
      options: [
        ["An abstract interface injected by reference or unique_ptr through the constructor", true],
        ["A std::function member holding the strategy callable", true],
        ["A template parameter supplying the strategy type at compile time", true],
        ["A global singleton the algorithm queries for behavior", false],
        ["Inheriting from the concrete strategy and overriding its non-virtual methods", false]
      ],
      explain: "C++ offers strategy at three costs: virtual interface (runtime swap, mixed containers), std::function (one callable, lambda-friendly, type-erased), template parameter (zero overhead, compile-time fixed). Singletons hide the dependency and kill test isolation; overriding non-virtual methods does not dispatch — base-typed callers keep calling the base version (hiding, not overriding)."
    },
    {
      type: "order",
      q: "Refactor a growing switch statement toward Open/Closed. Put the steps in a sensible order.",
      steps: [
        "Identify the axis of variation the switch encodes (the behavior that differs per case)",
        "Define an abstract interface capturing that behavior as virtual functions",
        "Move each case's logic into its own class implementing the interface",
        "Replace the switch with a virtual call through an injected interface (wiring/factory chooses the implementation)",
        "Add the next new behavior as a new class, leaving existing tested code untouched"
      ],
      explain: "The mechanical OCP refactor: variation axis, then abstraction, then one class per case, then injection replaces selection. The only switch-shaped survivor is a single creation site (factory/registry). Apply when the case list demonstrably grows; a stable small switch does not owe anyone a hierarchy."
    },
    {
      type: "order",
      q: "A class owns a raw OS handle and must become safely copyable and movable (rule of five). Order the implementation steps.",
      steps: [
        "Write the destructor releasing the handle exactly once",
        "Write the copy constructor duplicating the underlying resource (e.g., dup the handle)",
        "Implement copy assignment (idiomatically copy-and-swap for strong exception safety)",
        "Add noexcept move constructor and move assignment that steal the handle and null the source",
        "Longer term: extract a reusable RAII handle wrapper so this class returns to the rule of zero"
      ],
      explain: "Destruction defines ownership; copying must then duplicate the resource, not the handle value; copy-and-swap buys the strong guarantee cheaply; moves must be noexcept so vector growth moves rather than copies. The final step is the real lesson: write the five once, in a small wrapper, and let every other class stay at zero."
    },
    {
      level: "senior",
      type: "order",
      q: "An exported class in your shared library needs new state, but consumers must not rebuild. Order the PIMPL migration.",
      steps: [
        "Create an Impl struct in the .cpp file and move all private data members into it",
        "Leave a single std::unique_ptr<Impl> member as the class's only data",
        "Define the constructor and destructor in the .cpp, where Impl is a complete type",
        "Re-run the ABI checker to confirm layout and exported symbols are stable",
        "Add the new state as Impl members — future internal changes no longer touch the public header"
      ],
      explain: "PIMPL fixes the class's size at one pointer, so internals can evolve without breaking consumers' compiled layout assumptions. The out-of-line destructor is mandatory (unique_ptr must see the complete Impl to delete it). Verification belongs in CI: ABI stability is a property you check, not assume. One-time cost: an allocation and an indirection per object."
    },
    {
      type: "code",
      q: "This interface will be owned and deleted through base pointers. What completes it?",
      code: "struct Logger {\n  virtual void log(std::string_view msg) = 0;\n  ____\n};\n\nstd::unique_ptr<Logger> logger = makeFileLogger();",
      options: [
        ["virtual ~Logger() = default;", true],
        ["~Logger() = default;  (non-virtual: deleting via Logger* is UB)", false],
        ["Logger() = delete;", false],
        ["void ~Logger() override;", false]
      ],
      explain: "unique_ptr<Logger> deletes through the base pointer, so the destructor must be virtual — otherwise the derived destructor never runs (UB, leaked resources). 'virtual ~Logger() = default;' is the one-line interface staple. Deleting the constructor would make the class unusable; destructors have no return type and nothing to override here."
    },
    {
      type: "code",
      q: "Dog must replace Animal's virtual speak(). Which keyword completes the declaration safely?",
      code: "struct Animal {\n  virtual std::string speak() const { return \"...\"; }\n  virtual ~Animal() = default;\n};\nstruct Dog : Animal {\n  std::string speak() const ____ { return \"Woof\"; }\n};",
      options: [
        ["override", true],
        ["virtual  (not legal in that position; and adds no checking anyway)", false],
        ["new", false],
        ["= 0", false]
      ],
      explain: "'override' asks the compiler to verify a matching virtual base function exists — if the signature drifted (missing const, wrong parameter), you get an error instead of a silent new function that base-typed callers never reach. 'virtual' belongs before the return type and performs no such check; 'new' is C#'s hiding keyword, not C++; '= 0' would make Dog abstract with no body allowed there."
    },
    {
      type: "code",
      q: "OrderService should follow dependency inversion and be testable with a fake. Which parameter type completes the constructor?",
      code: "class OrderService {\npublic:\n  explicit OrderService(____ gateway) : gateway_(gateway) {}\nprivate:\n  PaymentGateway& gateway_;   // PaymentGateway is a pure-virtual interface\n};",
      options: [
        ["PaymentGateway&", true],
        ["PaymentGateway  (by value: abstract — will not compile; and would slice)", false],
        ["StripeGateway&  (couples the service to one concrete provider)", false],
        ["const PaymentGateway", false]
      ],
      explain: "The service depends on the abstraction, injected by reference: main() wires the real StripeGateway, tests pass a FakeGateway — no framework needed. By-value parameters cannot work: the interface is abstract, and even a concrete base would slice. Naming StripeGateway defeats DIP — high-level code would again depend on a detail."
    },
    {
      type: "code",
      q: "SocketConn owns a raw handle and is movable. Which signature completes the move constructor?",
      code: "class SocketConn {\n  int fd_;\npublic:\n  SocketConn(____ other) noexcept\n    : fd_(other.fd_) { other.fd_ = -1; }\n};",
      options: [
        ["SocketConn&&", true],
        ["const SocketConn&  (that is the copy constructor — and it could not null the source)", false],
        ["SocketConn&", false],
        ["SocketConn*", false]
      ],
      explain: "A move constructor takes an rvalue reference (SocketConn&&) so it binds to temporaries and std::move-d objects, steals the handle, and nulls the source — noexcept so vector growth will actually move. const& is copy (and const forbids modifying other.fd_); plain & would hijack ordinary lvalue construction; a pointer parameter is not a constructor the language ever calls implicitly."
    }
  ],
  arch: [
    {
      q: "The linker reports 'undefined reference to helper()'. The code compiled cleanly. What does this mean?",
      options: [
        ["helper() was declared (so compilation succeeded) but its definition was never linked — a missing .cpp in the build or a missing library on the link line", true],
        ["A syntax error in helper()'s body", false],
        ["helper() is private and inaccessible", false],
        ["The header declaring helper() lacks an include guard", false]
      ],
      explain: "Compilation only needs declarations; each TU compiles alone. The linker then must find exactly one definition for every referenced symbol. 'Undefined reference' = definition absent: the .cpp was never added to the target, the library was not linked, or (with static libs on some linkers) the library came before the object that needs it on the command line. Include guards are unrelated — they operate within a single TU."
    },
    {
      q: "The linker reports 'multiple definition of util()'. util() is a function written entirely in a header included by two .cpp files. What is the fix?",
      options: [
        ["Mark it inline (or move the body to a single .cpp) — each TU currently emits its own definition, violating the One Definition Rule at link time", true],
        ["Add #pragma once to the header", false],
        ["Rename the function in one of the .cpp files", false],
        ["Compile with -fpermissive to allow duplicates", false]
      ],
      explain: "Both TUs pasted the header and compiled a definition of util(); the linker sees two. #pragma once cannot help — it prevents double-inclusion within one TU, not across TUs. 'inline' changes the ODR rules: identical definitions per TU are allowed and merged. Templates and class-member functions defined in-class are implicitly inline, which is why they live in headers legally."
    },
    {
      q: "Why must template definitions (not just declarations) normally live in header files?",
      options: [
        ["The compiler must see the full definition to instantiate the template for each concrete type used in that translation unit", true],
        ["Headers are compiled with special template-aware flags", false],
        ["Templates are resolved by the linker, which only reads headers", false],
        ["It is convention only; a .cpp works identically", false]
      ],
      explain: "Instantiation is compile-time code generation: seeing vector<MyType> requires the template's body right there in the TU. A template defined in one .cpp is invisible to other TUs, producing undefined references at link. (Explicit instantiation in a .cpp for a known type list is the exception.) This is the structural reason template-heavy libraries are header-only."
    },
    {
      q: "What exactly does #pragma once (or an include guard) protect against?",
      options: [
        ["Including the same header twice within ONE translation unit — it does nothing about the same header being used by many TUs, which is normal and fine", true],
        ["The header being compiled by two different compilers", false],
        ["Link-time duplicate symbols across object files", false],
        ["Circular project dependencies", false]
      ],
      explain: "Guards stop double-paste in one TU (A.h includes C.h, B.h includes C.h, main.cpp includes both — without guards, C.h's classes would be redefined in that TU). Every TU including the header independently is the normal build model. Link-time duplicates are the ODR's territory: inline, or definitions in .cpp files."
    },
    {
      q: "Static library (.a/.lib) vs shared library (.so/.dll) — what is the core tradeoff?",
      options: [
        ["Static: code is copied into each executable at link time (self-contained, larger, updates need relink). Shared: loaded at runtime and shareable (smaller binaries, swappable — but ABI compatibility now matters)", true],
        ["Static libraries are faster to load but cannot contain templates", false],
        ["Shared libraries are read-only; static libraries are writable", false],
        ["Static libraries work only in debug builds", false]
      ],
      explain: "Static linking bakes the code in: deployment is one file and there is no version skew, but every consumer carries a copy and security fixes require relinking all of them. Shared libraries centralize the code and allow independent updates — which is precisely why their binary interface becomes a contract you must not break (layout, mangled names, calling conventions)."
    },
    {
      q: "What is an ABI, and how does it differ from an API?",
      options: [
        ["The binary-level contract: object layout, name mangling, calling conventions, vtable layout. Code can be API-compatible (recompiles fine) yet ABI-incompatible (already-compiled binaries misbehave)", true],
        ["A synonym for API used in systems programming", false],
        ["The set of assembly instructions a compiler may emit", false],
        ["The application's binary file format (ELF/PE)", false]
      ],
      explain: "API compatibility is judged by the compiler against headers; ABI compatibility is judged by already-built binaries against the new library. Adding a data member, adding/reordering virtual functions, or changing types breaks ABI silently even when every consumer would recompile cleanly. This is the entire reason PIMPL, opaque handles, and 'extern C' boundaries exist at shared-library edges."
    },
    {
      q: "In modern CMake, what is the significance of PUBLIC vs PRIVATE in target_link_libraries(mylib PUBLIC dep)?",
      options: [
        ["PUBLIC propagates dep's usage requirements (includes, links, flags) to mylib's consumers; PRIVATE keeps dep an implementation detail that stops at mylib", true],
        ["PUBLIC makes dep's source code visible; PRIVATE encrypts it", false],
        ["PUBLIC links dynamically, PRIVATE statically", false],
        ["They are interchangeable style choices", false]
      ],
      explain: "Modern CMake is a graph of targets with usage requirements: if mylib's public headers include dep's headers, consumers need them too — PUBLIC. If dep is used only inside mylib's .cpp files, PRIVATE stops the propagation, keeping the dependency tree honest and rebuilds smaller. (INTERFACE = consumers only, e.g. header-only libs.) Global include_directories/link_libraries are the legacy style to avoid."
    },
    {
      q: "What do vcpkg and Conan provide for a C++ project?",
      options: [
        ["Dependency management: fetch, build, and expose third-party libraries (typically via find_package in CMake) with consistent versions and flags across machines and CI", true],
        ["Runtime plugin loading for shared libraries", false],
        ["Compiler toolchains replacing GCC/Clang/MSVC", false],
        ["Automatic code formatting and linting", false]
      ],
      explain: "C++ has no built-in package ecosystem, and the historical alternatives — vendored source drops, system packages of random versions, README build steps — do not reproduce. vcpkg (manifest mode: vcpkg.json) and Conan pin versions, build with your toolchain, and integrate so CMakeLists just says find_package(fmt) + target_link_libraries(app PRIVATE fmt::fmt). New machine = configure + build."
    },
    {
      q: "In GoogleTest, what does 'EXPECT_EQ(a, b)' do that 'ASSERT_EQ(a, b)' does not?",
      options: [
        ["EXPECT records the failure and continues the test, gathering more diagnostics; ASSERT aborts the current test function immediately on failure", true],
        ["EXPECT compares addresses while ASSERT compares values", false],
        ["EXPECT only runs in debug builds", false],
        ["Nothing — they are aliases", false]
      ],
      explain: "Use EXPECT for independent checks so one failure still reports the rest; use ASSERT when continuing makes no sense (a null pointer you are about to dereference, a failed setup step). Related essentials: TEST_F fixtures for shared setup, parameterized tests for input tables, and gMock mocks — which require the mocked methods to be virtual (interfaces again)."
    },
    {
      q: "What bug classes does AddressSanitizer (ASan) catch?",
      options: [
        ["Memory errors: heap/stack buffer overflows, use-after-free, use-after-return/scope, double free — plus leaks via its LeakSanitizer component", true],
        ["Data races between threads", false],
        ["Arithmetic overflow and invalid casts", false],
        ["Deadlocks and priority inversion", false]
      ],
      explain: "ASan instruments allocations and memory accesses (~2x slowdown) and reports the bad access with the allocation and free stacks — turning corruption heisenbugs into readable reports. Races are TSan's job; overflow/casts are UBSan's; uninitialized reads are MSan's. The standard CI setup runs the test suite under ASan+UBSan in one job and TSan in another (ASan and TSan cannot combine)."
    },
    {
      q: "What does ThreadSanitizer (TSan) detect, and what is the main operational caveat?",
      options: [
        ["Data races and some deadlocks — but only in code that actually executes under it, so its power multiplies with test coverage and realistic concurrency in tests", true],
        ["All race conditions statically, without running the program", false],
        ["Memory leaks in multithreaded programs", false],
        ["CPU contention and false sharing", false]
      ],
      explain: "TSan watches the happens-before relationships of actual executions and flags unsynchronized conflicting accesses — including races that did not corrupt anything this run. It cannot see code paths that never ran: single-threaded unit tests find no races. Teams add stress tests that genuinely exercise concurrency under TSan. Overhead (~5-15x) keeps it in CI rather than production."
    },
    {
      q: "Why run the test suite under UndefinedBehaviorSanitizer (UBSan) when the tests already pass without it?",
      options: [
        ["Passing tests can still execute UB (signed overflow, misaligned access, bad casts, out-of-range shifts) that happens to look fine now but is license for miscompilation later — UBSan makes it fail loudly today", true],
        ["UBSan makes tests run faster", false],
        ["UBSan proves the absence of undefined behavior in the whole program", false],
        ["It is only useful for C code, not C++", false]
      ],
      explain: "UB is defined by the standard, not by whether the test noticed: today's optimizer may produce the expected output, next year's may not. UBSan's runtime checks turn silent contract violations into immediate diagnostics with stack traces, at low overhead — cheap enough to leave on in every CI test run (some teams even ship -fsanitize=undefined hardened builds). Like all sanitizers it verifies executed paths only."
    },
    {
      q: "What role does clang-tidy play alongside compiler warnings?",
      options: [
        ["Deeper static analysis: bug-pattern checks (use-after-move, dangling string_view), modernization (make_unique, override), and Core Guidelines enforcement — codified review running in CI", true],
        ["It formats code according to the project style", false],
        ["It replaces the need for code review", false],
        ["It runs the tests under instrumentation", false]
      ],
      explain: "Warnings catch what the compiler sees cheaply; clang-tidy runs hundreds of purpose-built checks with fix-it suggestions, encoding tribal knowledge (bugprone-*, performance-*, modernize-*, cppcoreguidelines-*) so reviews spend attention on design instead. clang-format handles style mechanically. Both belong in CI with a pinned config; new checks get introduced per-directory to avoid a thousand-warning wall."
    },
    {
      q: "Why does std::vector usually beat std::list even for workloads with mid-sequence insertions?",
      options: [
        ["Cache locality — vector's contiguous storage streams through the CPU cache, while each list node hop is a likely cache miss; shifting a few elements is often cheaper than chasing pointers", true],
        ["vector performs fewer allocations per insertion", false],
        ["list is not type-safe", false],
        ["It does not — list is always faster for insertion, as big-O says", false]
      ],
      explain: "Big-O hides constants: list's O(1) insert first requires an O(n) traversal of cache-missing nodes to find the spot, plus a per-node allocation; vector's O(n) shift is a fast contiguous memmove. Benchmarks put vector ahead until elements are large and positions are already known. Defaults: vector, then reserve(); deque for front+back; list only for stable iterators/splice requirements."
    },
    {
      q: "std::map vs std::unordered_map — when is the ordered map the right choice?",
      options: [
        ["When you need sorted iteration, range queries (lower_bound), or iterator/reference stability guarantees — otherwise unordered_map's O(1) average lookup usually wins", true],
        ["Always — map is the newer container", false],
        ["When keys are strings, which cannot be hashed", false],
        ["When the map is small, because unordered_map cannot hold fewer than 16 elements", false]
      ],
      explain: "map is a red-black tree: O(log n) everything, keys in order, iterators survive inserts/erases (except the erased one). unordered_map hashes: O(1) average lookup, no order, invalidation on rehash — the default for pure key→value lookup. Strings hash fine. Also real: for small n or hot paths, a sorted vector + binary search often beats both on cache behavior."
    },
    {
      q: "You know a vector will receive ~10,000 elements via push_back. What does calling reserve(10000) first buy you?",
      options: [
        ["One allocation instead of a growth series — no repeated reallocate-and-move cycles, and no iterator/pointer invalidation during the fill", true],
        ["It sets size() to 10000 with default-constructed elements", false],
        ["It is required — push_back past capacity throws otherwise", false],
        ["Nothing; vector already allocates exactly once", false]
      ],
      explain: "Geometric growth means a naive fill reallocates log(n) times, moving everything each time. reserve() pre-allocates capacity (size stays 0 — that distinction from resize() matters), making the fill a straight run of placement-constructions and keeping references stable throughout. Cheap, common, and the first fix for allocation-heavy hot paths."
    },
    {
      q: "Why prefer std::algorithms (sort, find_if, transform, erase_if) over hand-written loops?",
      options: [
        ["They state intent, are pre-debugged against edge cases (empty ranges, iterator invalidation traps like erase-in-loop), and are often better optimized than a first-draft loop", true],
        ["Hand-written loops are undefined behavior since C++20", false],
        ["Algorithms run in parallel by default", false],
        ["Algorithms skip bounds checking that loops must do", false]
      ],
      explain: "A reader sees std::erase_if(v, pred) and knows everything; a 12-line loop with index juggling must be verified — and the erase-inside-a-loop iterator bug is a rite of passage. C++20 ranges tighten it further (views::filter | views::transform, lazily composed). Parallelism is available but opt-in via execution policies. Reach for a raw loop when the operation genuinely has no algorithm shape."
    },
    {
      q: "What exactly makes two threads' access to the same int a data race, and what is the consequence?",
      options: [
        ["Conflicting access (at least one write) with no synchronization ordering them — and it is undefined behavior, not merely stale data: the optimizer may reorder, merge, or delete the accesses", true],
        ["Any concurrent read of shared data, which loses updates", false],
        ["It is safe as long as the variable fits in one machine word", false],
        ["A race only occurs if the threads run on different cores", false]
      ],
      explain: "The C++ memory model gives unsynchronized conflicting accesses no semantics at all. 'It is just an int, worst case I read an old value' is folklore: compilers legally cache values in registers, fuse writes, and assume no other thread interferes. Concurrent reads of immutable data are fine. Fixes: std::atomic for the lone flag/counter, a mutex for multi-step invariants."
    },
    {
      q: "Where does a std::mutex idiomatically live, and how is it locked?",
      options: [
        ["Next to the data it protects — same class, private, with locking via RAII guards (scoped_lock/lock_guard) so unlock happens on every path including exceptions", true],
        ["One global mutex per program, locked with .lock()/.unlock() calls", false],
        ["In thread-local storage so each thread has its own", false],
        ["Inside the thread object that owns the data", false]
      ],
      explain: "A mutex protects specific data; encapsulating both in one class makes unlocked access impossible to write from outside. Manual lock()/unlock() breaks on early returns and exceptions — guards are non-negotiable. Keep critical sections short, and never hold a lock across a callback or I/O you do not control (the classic self-deadlock). A thread-local mutex protects nothing shared."
    },
    {
      q: "Multiple threads increment a shared counter. When is std::atomic<int> the right tool rather than a mutex?",
      options: [
        ["When the shared state is that single variable — fetch_add is one indivisible, lock-free operation; the moment an invariant spans multiple variables or steps, use a mutex", true],
        ["Never — atomics are always slower than mutexes", false],
        ["Whenever more than two threads are involved", false],
        ["atomic<int> is only for read-only data", false]
      ],
      explain: "counter.fetch_add(1) (or ++counter) is race-free and cheap — right for counters, flags, sequence numbers. But atomics compose badly: 'if (count.load() < max) count++' is a check-then-act race even though each piece is atomic. Invariants across several operations or objects need mutual exclusion. Default to seq_cst ordering; relaxed/acquire-release is expert territory with real payoffs only on hot paths."
    },
    {
      q: "Why must condition_variable::wait always be called with a predicate — cv.wait(lock, []{ return !queue.empty(); })?",
      options: [
        ["Wakeups can be spurious or stale (another consumer took the item), so the condition must be re-checked under the lock after every wakeup; the predicate form does exactly that", true],
        ["The predicate tells the scheduler which thread to wake first", false],
        ["Without a predicate the wait cannot time out", false],
        ["It is a style preference; plain wait(lock) is equivalent", false]
      ],
      explain: "The pattern is state + mutex + cv: waiters sleep until notified, then MUST re-verify the state because (a) spurious wakeups are permitted and (b) between notify and waking, another thread may have consumed the condition. The predicate overload loops internally: while (!pred()) wait(lock). Producers change state under the mutex, then notify_one/all. Plain wait without a loop is a latent bug."
    },
    {
      q: "When are exceptions the right error mechanism versus std::optional/std::expected return types?",
      options: [
        ["Exceptions for rare, non-local failures where callers cannot act (RAII keeps propagation safe); optional/expected for routine, local failures — parse errors, lookups — where the type forces every call site to handle the case", true],
        ["Exceptions always — return codes are C legacy", false],
        ["expected always — exceptions are banned in modern C++", false],
        ["Exceptions in debug builds, error codes in release", false]
      ],
      explain: "A config file missing at startup is exceptional: throw, let main report. A user-supplied string failing to parse is Tuesday: expected<int, ParseError> puts the failure in the signature, and the compiler nags every caller who ignores it. Costs frame the choice: exceptions are ~free until thrown, expected adds a branch per call. Real codebases use both; some domains (games, embedded) build with -fno-exceptions, making expected-style mandatory."
    },
    {
      q: "What does compiling with -Wall -Wextra -Werror (or /W4 /WX) buy a team?",
      options: [
        ["The compiler's built-in static analysis — shadowed variables, narrowing, missing returns, unused results — becomes a hard gate instead of scrollback noise nobody reads", true],
        ["Guaranteed absence of undefined behavior", false],
        ["Slower generated code due to safety checks", false],
        ["It disables compiler optimizations that cause bugs", false]
      ],
      explain: "Warnings that do not fail the build decay into wallpaper; -Werror keeps the count at zero so every new one gets attention. -Wall -Wextra (misleading names — they are not 'all') catch real bug shapes cheaply at compile time with no runtime cost. They complement, not replace, sanitizers: warnings are static and conservative, sanitizers verify actual executions."
    },
    {
      level: "senior",
      q: "Two services deadlock: thread A holds mutex M1 wanting M2; thread B holds M2 wanting M1. What is the structural fix?",
      options: [
        ["A global lock-ordering discipline — all code acquires M1 before M2 — and where two must be taken together, std::scoped_lock(m1, m2) acquires both atomically with a deadlock-avoidance algorithm", true],
        ["Add a third mutex guarding the other two", false],
        ["Use try_lock in a retry loop until both succeed", false],
        ["Give each thread its own copy of both mutexes", false]
      ],
      explain: "Deadlock's classic recipe is inconsistent acquisition order; the cure is a documented hierarchy (order by address, by layer, by rank) plus scoped_lock's multi-mutex form for the take-two-at-once case (it uses std::lock's avoidance algorithm). try_lock spin loops trade deadlock for livelock and burnt CPU. Structural alternatives that remove the problem: merge the two datasets under one mutex, or redesign so no path needs both."
    },
    {
      level: "senior",
      q: "A service corrupts data intermittently under production load; the full test suite passes and single-request testing is clean. What is the most likely class of bug and the right tool?",
      options: [
        ["A data race — unsynchronized shared state that only manifests under concurrency; run realistic concurrent load under ThreadSanitizer, which flags the race even on runs that happen not to corrupt", true],
        ["A compiler bug — try a different optimization level and ship what works", false],
        ["Insufficient RAM on the production hosts", false],
        ["A hash collision in unordered_map", false]
      ],
      explain: "Load-dependent, non-deterministic corruption with clean serial tests is the data-race signature: the interleaving that corrupts needs contention to occur. TSan detects the unsynchronized access pattern itself, not the lucky/unlucky outcome — so a stress test under TSan finds in minutes what log-reading cannot. The fix is then ordinary: identify the shared state, give it an owner, protect it (mutex/atomic) or stop sharing it."
    },
    {
      type: "multi",
      q: "Which of these does AddressSanitizer detect? Select ALL that apply.",
      options: [
        ["Heap use-after-free", true],
        ["Heap or stack buffer overflow", true],
        ["Memory leaks (via its LeakSanitizer component)", true],
        ["Data races between threads", false],
        ["Signed integer overflow", false]
      ],
      explain: "ASan owns the memory-error family: out-of-bounds (heap, stack, globals), use-after-free/return/scope, double-free, plus leak reporting at exit. Races need TSan (and the two cannot run in one binary — separate CI jobs); arithmetic UB needs UBSan (which CAN combine with ASan, hence the standard ASan+UBSan job)."
    },
    {
      level: "senior",
      type: "multi",
      q: "libwidget.so is consumed by prebuilt customer binaries. Which changes break ABI compatibility? Select ALL that apply.",
      options: [
        ["Adding a data member to an exported class", true],
        ["Adding a new virtual function to an exported class", true],
        ["Changing an exported function's parameter type from int32_t to int64_t", true],
        ["Adding a brand-new free function to the library", false],
        ["Changing the internals of a non-inline function body in the .cpp, keeping its signature", false]
      ],
      explain: "Layout and symbol contracts are the ABI: new data members change size/offsets, new virtuals shift vtable slots, and parameter-type changes alter the mangled name and calling convention — all silently poison prebuilt callers. Purely additive symbols and internal implementation changes are safe (that is the point of out-of-line functions). Boundary hygiene — PIMPL, factory-created interfaces, C APIs — exists to shrink the breakable surface."
    },
    {
      type: "order",
      q: "Order the stages that turn main.cpp into a running executable.",
      steps: [
        "Preprocessor: #includes pasted in, macros expanded — producing one translation unit",
        "Compiler: the TU is parsed, templates instantiated, and optimized",
        "An object file is emitted: machine code plus a table of defined and unresolved symbols",
        "Linker: object files and libraries are combined, every symbol reference resolved to one definition",
        "The OS loader maps the executable (and shared libraries) and calls main"
      ],
      explain: "Each .cpp walks stages 1-3 independently — that isolation is why headers must carry declarations and why the linker exists at all. Error geography follows: syntax and template errors are stage 2, undefined-reference and multiple-definition errors are stage 4, missing-DLL errors are stage 5."
    },
    {
      type: "order",
      q: "Add a third-party library (say fmt) to a CMake + vcpkg project properly. Order the steps.",
      steps: [
        "Declare the dependency in the manifest (vcpkg.json), pinning versions via the builtin-baseline",
        "Configure with the vcpkg toolchain file so CMake can locate the package",
        "find_package(fmt CONFIG REQUIRED) in CMakeLists.txt",
        "target_link_libraries(app PRIVATE fmt::fmt) on the consuming target",
        "Include and use the library; CI builds clean from scratch, proving the setup reproduces"
      ],
      explain: "Manifest mode makes the dependency set part of the repo: versions pinned, no global machine state. The imported target (fmt::fmt) carries include paths and link flags as usage requirements — no hand-set variables. The CI-from-scratch step is the acceptance test: if a fresh clone builds, onboarding and build reproducibility are solved."
    },
    {
      level: "senior",
      type: "order",
      q: "A test fails intermittently in CI (roughly 1 run in 30), always in the multithreaded cache code. Order a disciplined resolution.",
      steps: [
        "Make it reproducible: loop the test locally under stress (repeat runs, more threads, tighter timing)",
        "Run the reproducer under ThreadSanitizer and capture the race report",
        "Read the two conflicting stack traces and identify the shared state and the missing synchronization",
        "Fix the design — give the state an owner and protect it (mutex/atomic) or eliminate the sharing",
        "Land the fix with a stress regression test, and keep a TSan job in CI to catch the next one"
      ],
      explain: "Flaky-in-CI plus concurrency is a race until proven otherwise. Rerunning until green ships the bug. The order matters: reproduce first (else you cannot verify any fix), let TSan name the exact accesses (else you fix a guess), fix ownership rather than sprinkling one lock on the symptom, and institutionalize the check so the class of bug stays caught."
    },
    {
      type: "code",
      q: "app uses the fmt library found via find_package. Which command completes the CMakeLists?",
      code: "find_package(fmt CONFIG REQUIRED)\nadd_executable(app src/main.cpp)\n____(app PRIVATE fmt::fmt)",
      options: [
        ["target_link_libraries", true],
        ["link_directories  (legacy global state, wires nothing to the target)", false],
        ["add_dependencies  (build ordering only — no include paths or linking)", false],
        ["target_compile_options", false]
      ],
      explain: "target_link_libraries against the imported fmt::fmt target pulls in everything as usage requirements — include paths, the library to link, any needed flags. That target-based propagation is the core of modern CMake. link_directories/include_directories are the legacy global style; add_dependencies only sequences builds; compile options are the wrong category."
    },
    {
      type: "code",
      q: "This small function lives in a header included by many .cpp files. Which keyword keeps the linker happy?",
      code: "// mathutil.h  (included by a.cpp, b.cpp, c.cpp ...)\n____ int clamp01(int v) {\n  return v < 0 ? 0 : (v > 1 ? 1 : v);\n}",
      options: [
        ["inline", true],
        ["extern  (declares external linkage — every TU still defines it: multiple definition)", false],
        ["virtual", false],
        ["volatile", false]
      ],
      explain: "A function defined in a header is compiled into every including TU; at link time that is 'multiple definition of clamp01' — an ODR violation. 'inline' relaxes the ODR: identical definitions per TU are permitted and merged. (This is also why templates and in-class member function bodies are legal in headers — they are implicitly inline.) virtual applies to member functions; volatile applies to objects."
    },
    {
      type: "code",
      q: "A consumer thread must sleep until the queue has work. What completes the wait correctly?",
      code: "std::unique_lock lock(mu);\ncv.wait(lock, ____);\nauto item = queue.front();  // must be safe here",
      options: [
        ["[&] { return !queue.empty(); }", true],
        ["[] { return true; }  (returns immediately — even when the queue is empty)", false],
        ["std::chrono::seconds(1)", false],
        ["&queue", false]
      ],
      explain: "The predicate form re-checks the condition under the lock after every wakeup, which is mandatory: wakeups can be spurious, and another consumer may have emptied the queue between notify and wake. A predicate of 'true' waits for nothing; a duration belongs to wait_for (still with a predicate!); a pointer to the queue is not a callable condition."
    },
    {
      type: "code",
      q: "CI should catch a suspected use-after-free in the test binary. Which flag completes the build line?",
      code: "g++ -g -O1 ____ tests.cpp -o tests && ./tests",
      options: [
        ["-fsanitize=address", true],
        ["-fsanitize=thread  (data races — a different job; cannot combine with ASan)", false],
        ["-O3 -DNDEBUG", false],
        ["-Wall -Werror  (static warnings — cannot see runtime lifetime errors)", false]
      ],
      explain: "AddressSanitizer instruments memory accesses and reports use-after-free at the moment it happens, with allocation and free stacks. Warnings are compile-time and rarely see lifetime bugs across functions; optimization flags change nothing about detection; TSan is the right tool for races but the wrong one here, and ASan+TSan cannot run in one binary — hence separate CI jobs."
    }
  ]
};
