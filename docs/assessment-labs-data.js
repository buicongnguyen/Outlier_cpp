(function () {
  "use strict";

  window.assessmentLabData = {
    mockMinutes: 165,
    targetScore: 75,
    tasks: [
      {
        id: "rank-first-repeat",
        number: 1,
        title: "Rank three answers: first repeated value",
        kind: "review",
        difficulty: "Warm-up",
        minutes: 12,
        points: 10,
        summary: "Judge correctness, find a counterexample, and rank competing C++ responses.",
        scenario: "A prompt asks for the value whose second occurrence appears earliest while scanning left to right. Return std::nullopt if no value repeats. Rank the three responses from best to worst and justify the ranking with correctness, complexity, and one decisive test.",
        instructions: [
          "Give an explicit best-to-worst ranking.",
          "State whether each response preserves the required left-to-right semantics.",
          "Give a concrete counterexample for every incorrect response.",
          "Compare time and auxiliary-space complexity.",
          "Judge accuracy first, then instruction following and presentation quality."
        ],
        thinkingPrompts: [
          "What exactly is ordered: values, first occurrences, or second occurrences?",
          "Which input information must every correct response preserve?",
          "For one adversarial input, at which statement does each response return?",
          "Which differences affect correctness, and which affect only performance or presentation?"
        ],
        reasoningHref: "reasoning-playbook.html#thinking-loop",
        starterCode: `// Treat each namespace as a separate response.
// Response A
namespace response_a {
std::optional<int> first_repeated(std::span<const int> values) {
    std::unordered_set<int> seen;
    for (int value : values) {
        if (!seen.insert(value).second) {
            return value;
        }
    }
    return std::nullopt;
}
} // namespace response_a

// Response B
namespace response_b {
std::optional<int> first_repeated(std::span<const int> values) {
    std::vector<int> copy(values.begin(), values.end());
    std::ranges::sort(copy);
    for (std::size_t i = 1; i < copy.size(); ++i) {
        if (copy[i - 1] == copy[i]) {
            return copy[i];
        }
    }
    return std::nullopt;
}
} // namespace response_b

// Response C
namespace response_c {
std::optional<int> first_repeated(std::span<const int> values) {
    for (std::size_t i = 0; i < values.size(); ++i) {
        for (std::size_t j = 0; j < i; ++j) {
            if (values[i] == values[j]) {
                return values[i];
            }
        }
    }
    return std::nullopt;
}
} // namespace response_c`,
        visibleTests: [
          "{4, 1, 3, 1, 4} -> 1",
          "{7, 8, 9} -> std::nullopt",
          "{} -> std::nullopt"
        ],
        hiddenTests: [
          "{2, 2, 1, 1} -> 2; Response B returns 1 and exposes the semantic bug.",
          "{5, 5, 5} -> 5.",
          "Negative values and INT_MIN/INT_MAX behave like ordinary keys."
        ],
        hint: "Sorting groups equal values, but ask what information is lost when the input order changes.",
        solutionText: [
          "Ranking: A, then C, then B.",
          "A is correct with average O(n) time and O(n) auxiliary space; pathological hashing can degrade it to worst-case O(n^2). That worst case is worth naming without treating it as a correctness failure.",
          "C is also correct because i is the candidate second occurrence and the inner loop checks whether that value appeared earlier. It uses O(1) auxiliary space but O(n^2) time.",
          "B is incorrect: sorting destroys occurrence order. For {2, 2, 1, 1}, the required answer is 2 because its second occurrence is at index 1, while B sorts and returns 1. B is O(n log n) time and O(n) auxiliary space for the copy."
        ],
        answerDiagram: {
          type: "flow",
          title: "Why order preservation decides the ranking",
          caption: "Trace the semantic information each response preserves before comparing complexity.",
          steps: [
            { label: "A: scan original order", detail: "The first failed set insertion is the earliest second occurrence." },
            { label: "C: advance i chronologically", detail: "Searching only the prefix preserves the same return semantics." },
            { label: "B: sort a copy", detail: "Sorting groups duplicates but destroys the temporal order required by the contract." },
            { label: "Verdict", detail: "A is correct and efficient; C is correct but quadratic; B is incorrect." }
          ]
        },
        solutionCode: "",
        rubric: [
          { id: "t1-ranking", points: 2, text: "Ranks A > C > B." },
          { id: "t1-semantics", points: 2, text: "Explains why A and C preserve second-occurrence order." },
          { id: "t1-counterexample", points: 3, text: "Uses a decisive counterexample such as {2,2,1,1} against B." },
          { id: "t1-complexity", points: 2, text: "Gives correct time and space tradeoffs for all three." },
          { id: "t1-clarity", points: 1, text: "Leads with a concise verdict and separates correctness from efficiency." }
        ]
      },
      {
        id: "debug-catalog-views",
        number: 2,
        title: "Debug dangling string_view keys",
        kind: "debugging",
        difficulty: "Intermediate",
        minutes: 20,
        points: 12,
        summary: "Find lifetime and state-consistency bugs in an apparently efficient catalog.",
        scenario: "A Catalog stores names and indexes them by std::string_view to avoid duplicate strings. It passes small tests, then lookups fail after growth, copies behave unpredictably, and duplicate insertion changes size. Diagnose every independent bug and provide an owning, exception-aware repair.",
        instructions: [
          "Identify the lifetime invariant violated by the index.",
          "Explain why reserve() is not a complete fix.",
          "Fix duplicate insertion and keep the two containers consistent if an allocation throws.",
          "State the ownership tradeoff in the repaired representation."
        ],
        thinkingPrompts: [
          "Who owns every character buffer, and which objects merely observe it?",
          "Which operations can relocate, copy, move, or destroy the observed storage?",
          "What does a default Catalog copy do to the stored view addresses?",
          "If the second container update throws, what state must be rolled back?"
        ],
        reasoningHref: "reasoning-playbook.html#ownership-data-flow",
        starterCode: `class Catalog {
public:
    bool add(std::string name) {
        const auto index = names_.size();
        names_.push_back(std::move(name));
        return by_name_.emplace(names_.back(), index).second;
    }

    std::optional<std::size_t> find(std::string_view name) const {
        const auto it = by_name_.find(name);
        if (it == by_name_.end()) {
            return std::nullopt;
        }
        return it->second;
    }

    std::size_t size() const noexcept { return names_.size(); }

private:
    std::vector<std::string> names_;
    std::unordered_map<std::string_view, std::size_t> by_name_;
};`,
        visibleTests: [
          "add(\"red\") is true; a second add(\"red\") must be false and must not change size().",
          "After thousands of additions, every previously added name remains findable.",
          "A copied Catalog remains valid after the source is destroyed."
        ],
        hiddenTests: [
          "Short-string optimization and vector relocation must not be relied upon for key lifetime.",
          "An exception while appending to names_ must not leave a key only in by_name_.",
          "Empty strings and long heap-backed strings are both valid names."
        ],
        hint: "Draw arrows from each string_view to the characters it observes, then simulate vector growth and a default copy of Catalog.",
        solutionText: [
          "The map does not own its keys. Its string_views observe character storage associated with vector elements; relocation and ordinary Catalog copying do not rebuild those views. The copy's map can still point into the source, so source destruction makes the failure deterministic even if a particular string move happened to preserve a heap buffer.",
          "reserve() only delays vector growth and cannot make the default copy safe. The original add also appends before discovering a duplicate, and a later map allocation failure leaves names_ changed.",
          "Use owning std::string keys in the index. Insert the key first, append the value second, and erase the new map entry if the vector append throws. This duplicates name storage, but makes ownership and copy behavior straightforward. A more elaborate design could use stable owning nodes and custom copy logic, but it is not the smallest maintainable repair."
        ],
        answerDiagram: {
          type: "flow",
          title: "Ownership failure and transactional repair",
          caption: "The bug is a broken lifetime edge; the repair gives the index ownership and rolls back partial state.",
          steps: [
            { label: "View borrows characters", detail: "unordered_map<string_view> stores addresses into vector-owned strings." },
            { label: "Reallocation or default copy", detail: "Reallocation can invalidate views; a copied Catalog preserves source addresses, which dangle when the source dies." },
            { label: "Lookup later", detail: "The map reads invalid key memory and its invariant is no longer meaningful." },
            { label: "Own the map key", detail: "unordered_map<string, index> gives each key an independent lifetime." },
            { label: "Rollback on throw", detail: "Erase the provisional map entry if the vector append fails." }
          ]
        },
        solutionCode: `class Catalog {
public:
    bool add(std::string name) {
        auto [it, inserted] = by_name_.try_emplace(name, names_.size());
        if (!inserted) {
            return false;
        }

        try {
            names_.push_back(std::move(name));
        } catch (...) {
            by_name_.erase(it);
            throw;
        }
        return true;
    }

    std::optional<std::size_t> find(std::string_view name) const {
        const auto it = by_name_.find(std::string{name});
        if (it == by_name_.end()) {
            return std::nullopt;
        }
        return it->second;
    }

    std::size_t size() const noexcept { return names_.size(); }

private:
    std::vector<std::string> names_;
    std::unordered_map<std::string, std::size_t> by_name_;
};`,
        rubric: [
          { id: "t2-lifetime", points: 3, text: "Identifies non-owning keys and explains growth/copy lifetime failures." },
          { id: "t2-duplicate", points: 2, text: "Prevents duplicate insertion from changing names_." },
          { id: "t2-exception", points: 2, text: "Keeps map and vector consistent if the second insertion step throws." },
          { id: "t2-code", points: 3, text: "Provides a coherent owning-key implementation with correct lookup." },
          { id: "t2-tradeoff", points: 2, text: "Explains why reserve is insufficient and names the storage/allocation tradeoff." }
        ]
      },
      {
        id: "implement-lru-cache",
        number: 3,
        title: "Implement an average-O(1) LRU cache",
        kind: "coding",
        difficulty: "Intermediate",
        minutes: 25,
        points: 14,
        summary: "Implement eviction, update recency, capacity-zero behavior, and safe object semantics.",
        scenario: "Complete a fixed-capacity least-recently-used cache. Both get and put should be average O(1). A successful get makes the key most recent. Updating an existing key changes its value and recency. Inserting past capacity evicts the least-recent key.",
        instructions: [
          "Use a list for recency and a hash map for lookup.",
          "Handle capacity zero without inserting anything.",
          "Do not invalidate the iterator stored for an existing entry when moving it to the front.",
          "Make copy behavior explicit because the map stores iterators into another member.",
          "Assume Key is copy-constructible, hashable, and equality-comparable; Value is copy-constructible and move-assignable; hash/equality operations do not throw."
        ],
        thinkingPrompts: [
          "Write the invariant that connects every map entry to exactly one list node.",
          "Enumerate get hit/miss and put existing/new/full/capacity-zero transitions.",
          "Which operation can move a node without invalidating its iterator?",
          "What happens to stored iterators after a default copy or a throwing insertion?"
        ],
        reasoningHref: "reasoning-playbook.html#lru-data-flow",
        starterCode: `template <class Key, class Value>
class LruCache {
public:
    explicit LruCache(std::size_t capacity) : capacity_(capacity) {}

    std::optional<Value> get(const Key& key) {
        // TODO
    }

    void put(Key key, Value value) {
        // TODO
    }

    std::size_t size() const noexcept { return items_.size(); }

private:
    using Item = std::pair<Key, Value>;
    using Iterator = typename std::list<Item>::iterator;

    std::size_t capacity_;
    std::list<Item> items_; // front is most recent
    std::unordered_map<Key, Iterator> index_;
};`,
        visibleTests: [
          "capacity 2: put(1,10), put(2,20), get(1), put(3,30) -> key 2 is evicted.",
          "put an existing key -> size is unchanged and a subsequent get returns the new value.",
          "capacity 0: every put is ignored and every get returns std::nullopt."
        ],
        hiddenTests: [
          "Repeated get calls do not duplicate list nodes.",
          "Updating the least-recent key makes it most recent before the next eviction.",
          "The type cannot be accidentally copied with iterators still targeting another object's list."
        ],
        hint: "std::list::splice can move a node to the front without invalidating its iterator.",
        solutionText: [
          "The list owns key/value entries in recency order; the map points to their stable list nodes. splice moves an existing node without invalidating the stored iterator.",
          "A default copy is wrong because copied map iterators still refer to the original list. This reference implementation deletes copy operations. Production code could implement copy by rebuilding the index.",
          "The insertion path rolls back the new list node if adding the map entry throws. Eviction occurs only after both structures contain the new item.",
          "This exercise requires copyable keys/values as used by the API and nonthrowing hash/equality. A throwing custom hash or equality function would require a separately specified weaker exception guarantee or a different representation for eviction."
        ],
        answerDiagram: {
          type: "flow",
          title: "Map-to-list invariant and eviction trace",
          caption: "The list owns entries in recency order; the map is only a fast index into stable nodes.",
          steps: [
            { label: "put(1)", detail: "List [1]; index 1 points to that node." },
            { label: "put(2)", detail: "List [2, 1]; front is most recent." },
            { label: "get(1)", detail: "splice node 1 to front without invalidating its iterator: [1, 2]." },
            { label: "put(3)", detail: "Insert [3, 1, 2], then erase the back key and pop the LRU node." },
            { label: "Copy boundary", detail: "Delete copying or rebuild every map iterator for the copied list." }
          ]
        },
        solutionCode: `template <class Key, class Value>
class LruCache {
public:
    explicit LruCache(std::size_t capacity) : capacity_(capacity) {}

    LruCache(const LruCache&) = delete;
    LruCache& operator=(const LruCache&) = delete;

    std::optional<Value> get(const Key& key) {
        const auto found = index_.find(key);
        if (found == index_.end()) {
            return std::nullopt;
        }
        items_.splice(items_.begin(), items_, found->second);
        return found->second->second;
    }

    void put(Key key, Value value) {
        if (capacity_ == 0) {
            return;
        }

        const auto found = index_.find(key);
        if (found != index_.end()) {
            found->second->second = std::move(value);
            items_.splice(items_.begin(), items_, found->second);
            return;
        }

        items_.emplace_front(std::move(key), std::move(value));
        try {
            index_.emplace(items_.front().first, items_.begin());
        } catch (...) {
            items_.pop_front();
            throw;
        }

        if (items_.size() > capacity_) {
            index_.erase(items_.back().first);
            items_.pop_back();
        }
    }

    std::size_t size() const noexcept { return items_.size(); }

private:
    using Item = std::pair<Key, Value>;
    using Iterator = typename std::list<Item>::iterator;

    std::size_t capacity_;
    std::list<Item> items_;
    std::unordered_map<Key, Iterator> index_;
};`,
        rubric: [
          { id: "t3-structure", points: 3, text: "Uses list plus hash map with a clear most/least-recent invariant." },
          { id: "t3-get", points: 2, text: "get returns the value and updates recency in average O(1)." },
          { id: "t3-put", points: 3, text: "put correctly handles insert, update, and eviction." },
          { id: "t3-edges", points: 2, text: "Handles capacity zero and repeated access/update cases." },
          { id: "t3-ownership", points: 2, text: "Prevents or correctly implements copying of iterator-bearing state." },
          { id: "t3-quality", points: 2, text: "Keeps both structures consistent and states average complexity." }
        ]
      },
      {
        id: "atomic-wallet",
        number: 4,
        title: "Repair an atomic check-then-act race",
        kind: "debugging",
        difficulty: "Concurrency",
        minutes: 18,
        points: 12,
        summary: "Use compare-exchange correctly and explain when an atomic is the right tool.",
        scenario: "Multiple threads withdraw from one integer balance that must never be negative. The implementation uses an atomic, but the balance can become negative because the eligibility check and update are separate operations. Fix it without a mutex, validate construction, then explain exactly why an atomic is sufficient here and when it would stop being sufficient.",
        instructions: [
          "Preserve the invariant balance >= 0 for positive withdrawals.",
          "Reject a negative initial balance.",
          "Handle compare_exchange_weak updating its expected argument after failure.",
          "Choose and justify memory order.",
          "Contrast this one-variable invariant with a multi-field account invariant."
        ],
        thinkingPrompts: [
          "Write the one-variable invariant before choosing a synchronization primitive.",
          "Construct a two-thread trace between the eligibility check and the subtraction.",
          "What observed value must be revalidated when another thread changes the balance?",
          "Does this atomic publish any unrelated data, or protect only its own integer state?"
        ],
        reasoningHref: "reasoning-playbook.html#atomic-cas-loop",
        starterCode: `class Wallet {
public:
    explicit Wallet(int cents) : cents_(cents) {}

    bool withdraw(int amount) {
        if (amount <= 0) {
            return false;
        }
        if (cents_.load() < amount) {
            return false;
        }
        cents_.fetch_sub(amount);
        return true;
    }

    int balance() const noexcept { return cents_.load(); }

private:
    std::atomic<int> cents_;
};`,
        visibleTests: [
          "constructing Wallet(-1) -> std::invalid_argument.",
          "balance 100: two concurrent withdraw(80) calls -> exactly one succeeds and balance is 20.",
          "withdraw(0) and withdraw(-1) -> false with no balance change.",
          "balance 50: withdraw(50) -> true and balance is 0."
        ],
        hiddenTests: [
          "Many losing CAS attempts must re-check the newly observed balance.",
          "The implementation never transiently publishes a negative balance.",
          "No unrelated data is assumed to become visible through this atomic.",
          "Correctness does not claim lock-free or wait-free progress; those properties are separate and implementation/algorithm dependent."
        ],
        hint: "Make the condition and subtraction one conditional read-modify-write operation with a CAS loop.",
        solutionText: [
          "The load and fetch_sub are individually atomic but not one transaction. Two threads can both observe enough money before both subtract.",
          "A compare-exchange loop commits only if the balance still equals the value that passed the check. On failure, compare_exchange_weak writes the current balance into expected, so the loop naturally re-evaluates it.",
          "The constructor rejects a negative initial balance, so every public operation preserves the nonnegative invariant.",
          "memory_order_relaxed is enough for this isolated integer invariant: atomicity and modification order are required, but the balance is not publishing other memory. Use a mutex when withdrawing must update a ledger, currency, timestamp, or several balances as one invariant; separate atomics cannot make a multi-object transaction.",
          "Correctness from atomicity is separate from progress. std::atomic<int> is not guaranteed lock-free on every implementation, and even a lock-free CAS loop is not wait-free because one caller can repeatedly lose retries."
        ],
        answerDiagram: {
          type: "sequence",
          title: "CAS retry interleaving",
          caption: "CAS gives the successful state change one linearization point; a failed CAS updates expected for the next check.",
          lanes: ["Thread A", "Atomic balance", "Thread B"],
          rows: [
            ["load expected = 100", "100", "load expected = 100"],
            ["CAS 100 → 20 succeeds", "20", ""],
            ["", "20", "CAS 100 → 20 fails; expected becomes 20"],
            ["returns true", "20", "recheck 20 < 80; returns false"]
          ]
        },
        solutionCode: `class Wallet {
public:
    explicit Wallet(int cents) : cents_(cents) {
        if (cents < 0) {
            throw std::invalid_argument("balance must be nonnegative");
        }
    }

    bool withdraw(int amount) {
        if (amount <= 0) {
            return false;
        }

        int current = cents_.load(std::memory_order_relaxed);
        while (current >= amount) {
            if (cents_.compare_exchange_weak(
                    current,
                    current - amount,
                    std::memory_order_relaxed,
                    std::memory_order_relaxed)) {
                return true;
            }
        }
        return false;
    }

    int balance() const noexcept {
        return cents_.load(std::memory_order_relaxed);
    }

private:
    std::atomic<int> cents_;
};`,
        rubric: [
          { id: "t4-race", points: 2, text: "Explains the check-then-act interleaving precisely." },
          { id: "t4-cas", points: 4, text: "Implements a correct CAS loop that rechecks updated expected values." },
          { id: "t4-input", points: 1, text: "Rejects a negative initial balance and non-positive withdrawals." },
          { id: "t4-order", points: 2, text: "Justifies relaxed ordering for this isolated atomic invariant." },
          { id: "t4-choice", points: 3, text: "Explains why atomic fits one integer and mutex fits compound state/invariants." }
        ]
      },
      {
        id: "bounded-closeable-queue",
        number: 5,
        title: "Build a closeable bounded MPMC queue",
        kind: "coding",
        difficulty: "Concurrency",
        minutes: 35,
        points: 20,
        summary: "Coordinate multiple producers and consumers with a mutex, two condition variables, and shutdown.",
        scenario: "Implement a fixed-capacity queue used by multiple producer and consumer threads. push waits while full; pop waits while empty. close is idempotent, rejects future pushes, wakes every waiter, and still allows consumers to drain queued items. After close and drain, pop returns std::nullopt.",
        instructions: [
          "Reject capacity zero instead of creating a queue that can never make progress.",
          "Use predicate waits so spurious wakeups are harmless.",
          "Notify producers after pop and consumers after push; close must wake both groups.",
          "Answer the review question: is this implementation non-blocking in the concurrency-progress sense? Why or why not?",
          "State the exception or type assumption needed when moving T out of the queue.",
          "State the safe lifecycle: close the queue, join every thread that can access it, then destroy it."
        ],
        thinkingPrompts: [
          "Enumerate open/closed crossed with empty/partial/full before writing any wait.",
          "For push and pop, what predicate makes both progress and shutdown wakeups safe?",
          "Which state mutation must happen under the mutex, and which waiter is notified afterward?",
          "After close, which queued work remains valid and when may the object be destroyed?",
          "Can any operation wait on a mutex or condition variable? What progress guarantee follows?"
        ],
        reasoningHref: "reasoning-playbook.html#queue-state-machine",
        starterCode: `template <class T>
class BoundedQueue {
    static_assert(std::is_nothrow_move_constructible_v<T>,
                  "T must be nothrow move-constructible");

public:
    explicit BoundedQueue(std::size_t capacity);

    bool push(T value) {
        // Wait for space or closure. Return false after closure.
    }

    std::optional<T> pop() {
        // Wait for data or closure. Drain queued data before returning nullopt.
    }

    void close() {
        // Idempotent and wake every producer and consumer.
    }

private:
    std::size_t capacity_;
    std::deque<T> queue_;
    bool closed_ = false;
    std::mutex mutex_;
    std::condition_variable not_empty_;
    std::condition_variable not_full_;
};`,
        visibleTests: [
          "capacity 1: a second producer blocks until a consumer pops the first item.",
          "a consumer blocked on an empty queue wakes after push and receives the item.",
          "close on an empty queue wakes pop -> std::nullopt; push -> false.",
          "close with queued items: consumers receive all items, then std::nullopt."
        ],
        hiddenTests: [
          "close wakes producers blocked because the queue is full, and each returns false.",
          "Repeated close calls are safe; multiple producers and consumers do not lose or duplicate items.",
          "Predicates are checked while holding the mutex, including the closed state.",
          "T is constrained to be nothrow move-constructible when removed; a production generic API must define another exception policy otherwise.",
          "close() does not make concurrent object destruction safe: all users are joined before the queue's lifetime ends."
        ],
        hint: "The producer predicate is closed_ || size < capacity; the consumer predicate is closed_ || !empty. Both condition variables participate in shutdown.",
        solutionText: [
          "One mutex protects queue_, closed_, and their joint invariants. Predicate waits handle both spurious wakeups and the shutdown transition. Unlocking before notify reduces unnecessary wake-then-block behavior; correctness does not depend on that micro-optimization.",
          "This queue is thread-safe but not non-blocking. Operations may wait on a mutex or condition variable, so it is a blocking algorithm. Lock-free means the system as a whole keeps making progress; wait-free means each operation completes within a bounded number of its own steps. A bounded ring design can avoid dynamic reclamation, while unbounded node-based designs often need it. Those alternatives require different progress proofs and API/representation constraints.",
          "Moving T out can throw after modifying the front object. The reference constrains T to be nothrow move-constructible. Another production generic API must specify recovery or copy behavior.",
          "Shutdown protocol is separate from object lifetime: call close(), join every producer and consumer, and only then destroy the queue."
        ],
        answerDiagram: {
          type: "state",
          title: "Bounded queue state machine",
          caption: "close is a one-way transition; closed queues drain existing data but accept no new pushes.",
          states: [
            { id: "open-empty", label: "OPEN · EMPTY", detail: "pop waits; push creates data" },
            { id: "open-partial", label: "OPEN · PARTIAL", detail: "push and pop can proceed" },
            { id: "open-full", label: "OPEN · FULL", detail: "push waits; pop creates capacity" },
            { id: "closed-draining", label: "CLOSED · DRAINING", detail: "push fails; pop returns queued items" },
            { id: "closed-empty", label: "CLOSED · EMPTY", detail: "push fails; pop returns nullopt" }
          ],
          transitions: [
            "push: open empty/partial → one more item; notify a consumer",
            "pop: open/closed with data → one fewer item; notify a producer",
            "close: any open state → closed state; notify all on both condition variables",
            "last draining pop: closed draining → closed empty; no reopen transition"
          ]
        },
        solutionCode: `template <class T>
class BoundedQueue {
    static_assert(std::is_nothrow_move_constructible_v<T>,
                  "T must be nothrow move-constructible");

public:
    explicit BoundedQueue(std::size_t capacity) : capacity_(capacity) {
        if (capacity_ == 0) {
            throw std::invalid_argument("capacity must be positive");
        }
    }

    bool push(T value) {
        std::unique_lock lock(mutex_);
        not_full_.wait(lock, [this] {
            return closed_ || queue_.size() < capacity_;
        });
        if (closed_) {
            return false;
        }
        queue_.push_back(std::move(value));
        lock.unlock();
        not_empty_.notify_one();
        return true;
    }

    std::optional<T> pop() {
        std::unique_lock lock(mutex_);
        not_empty_.wait(lock, [this] {
            return closed_ || !queue_.empty();
        });
        if (queue_.empty()) {
            return std::nullopt;
        }
        T value = std::move(queue_.front());
        queue_.pop_front();
        lock.unlock();
        not_full_.notify_one();
        return value;
    }

    void close() {
        {
            std::lock_guard lock(mutex_);
            closed_ = true;
        }
        not_empty_.notify_all();
        not_full_.notify_all();
    }

private:
    std::size_t capacity_;
    std::deque<T> queue_;
    bool closed_ = false;
    std::mutex mutex_;
    std::condition_variable not_empty_;
    std::condition_variable not_full_;
};`,
        rubric: [
          { id: "t5-state", points: 3, text: "Protects queue, capacity condition, and closed state with one mutex." },
          { id: "t5-push", points: 3, text: "push uses the correct predicate, enqueues safely, and rejects closure." },
          { id: "t5-pop", points: 4, text: "pop waits correctly, drains after close, and returns nullopt only when closed and empty." },
          { id: "t5-close", points: 3, text: "close is idempotent and wakes both producer and consumer waiters." },
          { id: "t5-edges", points: 2, text: "Handles zero capacity and spurious wakeups." },
          { id: "t5-progress", points: 3, text: "Correctly classifies the queue as blocking and contrasts lock-free/wait-free progress." },
          { id: "t5-exception", points: 2, text: "States a defensible move-exception policy and close/join/destroy lifecycle." }
        ]
      },
      {
        id: "deadlock-transfer",
        number: 6,
        title: "Fix transfer deadlock and self-locking",
        kind: "debugging",
        difficulty: "Concurrency",
        minutes: 15,
        points: 10,
        summary: "Repair ABBA deadlock while keeping a two-account invariant atomic.",
        scenario: "Two threads call transfer(a, b, 10) and transfer(b, a, 20) at the same time. Production occasionally freezes. A self-transfer can also hang, and crediting the destination can overflow. Explain the failures and implement a deadlock-safe, overflow-checked repair without exposing an intermediate total balance.",
        instructions: [
          "Show the ABBA interleaving that creates circular wait.",
          "Handle source and destination referring to the same object.",
          "Acquire both locks with a standard deadlock-avoidance facility.",
          "Keep account-state validation and both balance changes inside the critical section."
        ],
        thinkingPrompts: [
          "Use one resource-graph convention precisely: mutex → thread means ownership, and thread → mutex means waiting.",
          "Can the edges form a cycle when callers reverse the account order?",
          "Can from and to name the same non-recursive mutex?",
          "Which validation depends on shared account state and therefore requires both locks?"
        ],
        reasoningHref: "reasoning-playbook.html#transfer-sequence",
        starterCode: `struct Account {
    std::int64_t balance;
    std::mutex mutex;
};

bool transfer(Account& from, Account& to, std::int64_t amount) {
    std::lock_guard from_lock(from.mutex);
    std::lock_guard to_lock(to.mutex);
    if (amount <= 0 || from.balance < amount) {
        return false;
    }
    from.balance -= amount;
    to.balance += amount;
    return true;
}`,
        visibleTests: [
          "Opposite-direction transfers complete repeatedly under a timeout.",
          "transfer(account, account, 10) returns false without blocking.",
          "Insufficient funds, non-positive amounts, and a destination-credit overflow return false without changing either account."
        ],
        hiddenTests: [
          "The total of the two balances is unchanged after every successful transfer.",
          "No balance check occurs before both account locks are held.",
          "A destination at INT64_MAX rejects a positive credit without signed overflow.",
          "Stress with many opposite-direction transfers completes and preserves the total."
        ],
        hint: "std::scoped_lock can lock multiple mutexes using a deadlock-avoidance algorithm, but do not pass the same non-recursive mutex twice.",
        solutionText: [
          "Thread 1 can hold from=a and wait for b while thread 2 holds from=b and waits for a. That is circular wait. A self-transfer tries to lock the same non-recursive mutex twice in one thread.",
          "Reject self-transfer and non-positive input before locking, then use std::scoped_lock with both mutexes. The balance and overflow checks plus both mutations occur while both accounts are locked, preserving the joint invariant without undefined signed overflow."
        ],
        answerDiagram: {
          type: "sequence",
          title: "ABBA wait cycle and repair boundary",
          caption: "The broken version exposes partial lock ownership; scoped_lock acquires the mutex set with deadlock avoidance.",
          lanes: ["Thread 1: A → B", "Lock state", "Thread 2: B → A"],
          rows: [
            ["locks A", "A owned by T1", "locks B"],
            ["requests B and waits", "A owned by T1; B owned by T2", "requests A and waits"],
            ["cannot progress", "cycle: T1 → B → T2 → A → T1", "cannot progress"],
            ["repair: reject alias, scoped_lock(A,B)", "validate and update while both held", "same acquisition protocol"]
          ]
        },
        solutionCode: `bool transfer(Account& from, Account& to, std::int64_t amount) {
    if (amount <= 0 || std::addressof(from) == std::addressof(to)) {
        return false;
    }

    std::scoped_lock lock(from.mutex, to.mutex);
    if (from.balance < amount ||
        to.balance > std::numeric_limits<std::int64_t>::max() - amount) {
        return false;
    }
    from.balance -= amount;
    to.balance += amount;
    return true;
}`,
        rubric: [
          { id: "t6-abba", points: 2, text: "Describes the opposite lock-order interleaving." },
          { id: "t6-self", points: 2, text: "Rejects aliased accounts before attempting two locks." },
          { id: "t6-lock", points: 3, text: "Uses std::scoped_lock or std::lock with adopted guards correctly." },
          { id: "t6-invariant", points: 2, text: "Checks balance/overflow and updates while both locks are held." },
          { id: "t6-tests", points: 1, text: "Includes a concurrent regression test and total-balance invariant." }
        ]
      },
      {
        id: "write-span-rubric",
        number: 7,
        title: "Evaluate an answer and write a grading rubric",
        kind: "review",
        difficulty: "Expert workflow",
        minutes: 20,
        points: 12,
        summary: "Correct a lifetime explanation, propose API repairs, and make evaluation objective.",
        scenario: "Review the C++20 function and the sample AI answer below. First turn the scenario into a precise standalone assessment question. Then write a gold answer, create your own objective 10-point grading rubric, and score the sample response against it.",
        instructions: [
          "Author a standalone question that states the C++ version, required analysis, and redesign deliverables.",
          "Give the sample response a verdict and score before the long explanation.",
          "Name the exact lifetime boundary and why std::span does not extend it.",
          "Give at least two valid API redesigns with different ownership/performance tradeoffs.",
          "Write a 10-point rubric whose criteria can be checked without guessing intent."
        ],
        thinkingPrompts: [
          "For every returned view, which object owns the referenced elements?",
          "At which exact statement or scope boundary can that owner die or invalidate storage?",
          "Does the caller need independent ownership, caller-provided storage, or a documented borrowed view?",
          "Can every rubric point be awarded from words or code actually present in the response?"
        ],
        reasoningHref: "reasoning-playbook.html#ownership-data-flow",
        starterCode: `std::span<const int> positive_values(std::span<const int> input) {
    std::vector<int> result;
    for (int value : input) {
        if (value > 0) {
            result.push_back(value);
        }
    }
    return result;
}

// Sample response to evaluate:
// "This is safe because span keeps the vector's allocation alive. Returning a
// const span also prevents the caller from invalidating it. The only issue is
// that result should reserve(input.size()) for performance."`,
        visibleTests: [
          "The authored question is answerable without unstated context and asks for both diagnosis and repair.",
          "Call with {-1, 2, 3}; any access through the returned span must be well-defined.",
          "The redesign must make the owner of filtered values unambiguous.",
          "The rubric must total exactly 10 points."
        ],
        hiddenTests: [
          "Empty input does not make a dangling view design acceptable.",
          "reserve changes allocation behavior, not lifetime.",
          "span<const int> prevents mutation through that view; it neither owns storage nor prevents other aliases from invalidating it."
        ],
        hint: "A span is a pointer-and-length view. Ask what object owns the pointed-to elements after the function returns.",
        solutionText: [
          "Example authored question: In C++20, determine whether positive_values has defined behavior after it returns. Explain the ownership and lifetime of every relevant object, evaluate the sample response, and provide two safe API redesigns with different ownership tradeoffs. Then write a 10-point objective rubric and use it to score the sample.",
          "Verdict: incorrect; reference score 0/10. result is destroyed when positive_values returns, so the returned span refers to dead storage. span is non-owning, const applies to element access through that span, and reserve has no effect on post-return lifetime.",
          "Small owning redesign: return std::vector<int>. Caller-provided-storage redesign: accept std::vector<int>& output or an output iterator. A lazy alternative is a ranges filter view over caller-owned input, but its validity remains tied to the caller's range and that borrowing contract must be explicit.",
          "Example objective rubric: 3 points for identifying destruction of result and the dangling span; 2 for stating span is non-owning and const does not extend lifetime; 2 for an owning vector return; 1 for a valid caller-owned/lazy alternative with lifetime constraints; 1 for rejecting reserve as a lifetime fix; 1 for clear verdict and edge-case discussion. The sample earns 0 because it meets none of these criteria. reserve can be a performance improvement in a safe owning redesign, but it cannot repair the returned view's lifetime."
        ],
        answerDiagram: {
          type: "flow",
          title: "Returned-view lifetime trace",
          caption: "Follow the owner through the return boundary before discussing constness or performance.",
          steps: [
            { label: "Construct local vector", detail: "result owns the filtered integer storage." },
            { label: "Create returned span", detail: "span stores only an address and length; it owns nothing." },
            { label: "Function returns", detail: "the local vector destructor releases its storage." },
            { label: "Caller uses span", detail: "the address refers to dead storage; access is undefined behavior." },
            { label: "Redesign", detail: "return an owning vector or make the caller-owned borrowing contract explicit." }
          ]
        },
        solutionCode: `std::vector<int> positive_values(std::span<const int> input) {
    std::vector<int> result;
    result.reserve(input.size());
    for (int value : input) {
        if (value > 0) {
            result.push_back(value);
        }
    }
    return result;
}`,
        rubric: [
          { id: "t7-question", points: 2, text: "Authors a precise standalone C++20 question with diagnosis and redesign deliverables." },
          { id: "t7-verdict", points: 1, text: "Leads with an appropriate verdict and score." },
          { id: "t7-explanation", points: 3, text: "Correctly explains span ownership, const, destruction, and why reserve is irrelevant." },
          { id: "t7-redesigns", points: 2, text: "Gives at least two valid redesigns and their ownership tradeoffs." },
          { id: "t7-rubric", points: 3, text: "Creates objective criteria totaling exactly 10 points." },
          { id: "t7-scoring", points: 1, text: "Applies the authored rubric consistently to the sample." }
        ]
      },
      {
        id: "top-error-codes",
        number: 8,
        title: "Implement stable top error-code aggregation",
        kind: "coding",
        difficulty: "Final sprint",
        minutes: 20,
        points: 10,
        summary: "Turn a precise ranking contract into clean C++20 code and edge tests.",
        scenario: "Implement top_error_codes. Return up to k distinct error codes ordered by decreasing frequency. Break frequency ties by the code's first appearance in the input. Target average O(n + u log u) time and O(u) extra space, where u is the number of distinct codes.",
        instructions: [
          "Do not mutate the input and do not order ties lexicographically.",
          "Return an empty vector for k == 0 or empty input.",
          "Avoid sorting all n occurrences when only u distinct codes are needed.",
          "State average-case assumptions behind unordered_map complexity and account for string hashing/copying costs."
        ],
        thinkingPrompts: [
          "Which tie-break metadata is lost if only final frequencies are retained?",
          "What work belongs to n input occurrences and what belongs to u distinct codes?",
          "Write the comparator keys and their directions before writing the comparator.",
          "What must happen for k == 0, empty input, all-unique input, and k greater than u?"
        ],
        reasoningHref: "reasoning-playbook.html#algorithm-pipeline",
        starterCode: `std::vector<std::string> top_error_codes(
    std::span<const std::string> codes,
    std::size_t k) {
    // TODO
}`,
        visibleTests: [
          "{\"E2\",\"E1\",\"E2\",\"E1\",\"E3\"}, k=2 -> {\"E2\",\"E1\"} (tie, E2 appeared first).",
          "{\"A\",\"B\",\"A\",\"C\",\"A\",\"B\"}, k=5 -> {\"A\",\"B\",\"C\"}.",
          "{}, k=3 and any input with k=0 -> {}."
        ],
        hiddenTests: [
          "All codes unique -> preserve first-appearance order up to k.",
          "k greater than the distinct count -> return every distinct code once.",
          "Empty strings are ordinary error codes; input remains unchanged."
        ],
        hint: "Record both count and first index per distinct code, then sort one row per distinct code with a two-key comparator.",
        solutionText: [
          "Return immediately for k == 0 or empty input. Otherwise, the hash table records frequency and first position in one pass. A vector containing one row per distinct code is then sorted by count descending and first position ascending.",
          "With bounded-length error codes and average O(1) hash-table operations, this is average O(n + u log u) time plus O(u) records. For variable-length strings, also account for the total characters hashed and copied; worst-case hash behavior is not guaranteed linear."
        ],
        answerDiagram: {
          type: "flow",
          title: "Stable aggregation pipeline",
          caption: "Keep the first index during aggregation so the final sort can reproduce the required tie order.",
          steps: [
            { label: "Read n occurrences", detail: "E2, E1, E2, E1, E3" },
            { label: "Aggregate metadata", detail: "count and first index for each distinct code" },
            { label: "Build u rows", detail: "E2:(2,0), E1:(2,1), E3:(1,4)" },
            { label: "Sort composite key", detail: "count descending, then first index ascending" },
            { label: "Take min(k,u)", detail: "return distinct codes without mutating input" }
          ]
        },
        solutionCode: `std::vector<std::string> top_error_codes(
    std::span<const std::string> codes,
    std::size_t k) {
    struct Stat {
        std::size_t count = 0;
        std::size_t first = 0;
    };
    struct Row {
        std::string code;
        std::size_t count;
        std::size_t first;
    };

    if (k == 0 || codes.empty()) {
        return {};
    }

    std::unordered_map<std::string, Stat> stats;
    for (std::size_t i = 0; i < codes.size(); ++i) {
        auto [it, inserted] = stats.try_emplace(codes[i], Stat{0, i});
        (void)inserted;
        ++it->second.count;
    }

    std::vector<Row> rows;
    rows.reserve(stats.size());
    for (const auto& entry : stats) {
        rows.push_back(Row{entry.first, entry.second.count, entry.second.first});
    }
    std::ranges::sort(rows, [](const Row& left, const Row& right) {
        if (left.count != right.count) {
            return left.count > right.count;
        }
        return left.first < right.first;
    });

    std::vector<std::string> result;
    result.reserve(std::min(k, rows.size()));
    for (std::size_t i = 0; i < std::min(k, rows.size()); ++i) {
        result.push_back(std::move(rows[i].code));
    }
    return result;
}`,
        rubric: [
          { id: "t8-count", points: 2, text: "Counts one record per distinct code and stores first appearance." },
          { id: "t8-order", points: 3, text: "Sorts by frequency descending and first index ascending." },
          { id: "t8-edges", points: 2, text: "Handles k=0, empty input, unique-only input, and k>u." },
          { id: "t8-complexity", points: 2, text: "Explains average O(n + u log u) under bounded-code/hash assumptions and notes character costs." },
          { id: "t8-quality", points: 1, text: "Uses clear types, leaves input unchanged, and returns distinct codes only." }
        ]
      }
    ]
  };
})();
