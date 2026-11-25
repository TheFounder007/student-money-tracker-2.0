(() => {
  const STORAGE_KEY = "student_expense_tracker_items_v1";
  const VALID_CATEGORIES = new Set(["Food", "Travel", "Shopping", "Education", "Other"]);

  const expenseForm = document.getElementById("expense-form");
  const nameInput = document.getElementById("expense-name");
  const amountInput = document.getElementById("expense-amount");
  const categorySelect = document.getElementById("expense-category");

  const nameError = document.getElementById("name-error");
  const amountError = document.getElementById("amount-error");
  const categoryError = document.getElementById("category-error");

  const categoryFilter = document.getElementById("category-filter");
  const expenseList = document.getElementById("expense-list");
  const emptyState = document.getElementById("empty-state");
  const emptyTitle = document.getElementById("empty-title");
  const emptySubtitle = document.getElementById("empty-subtitle");

  const totalLabel = document.getElementById("total-label");
  const totalAmountEl = document.getElementById("total-amount");
  const totalMetaEl = document.getElementById("total-meta");

  const currencyFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  });

  let expenses = loadExpenses();

  function loadExpenses() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        (item) =>
          item &&
          typeof item.id === "string" &&
          typeof item.name === "string" &&
          item.name.trim() !== "" &&
          typeof item.amount === "number" &&
          Number.isFinite(item.amount) &&
          item.amount > 0 &&
          VALID_CATEGORIES.has(item.category)
      );
    } catch {
      return [];
    }
  }

  function saveExpenses() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
    } catch {
      // Ignore storage errors (e.g., private browsing quota restrictions).
    }
  }

  function generateId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return `exp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function setFieldError(inputEl, errorEl, message) {
    errorEl.textContent = message;
    if (message) {
      inputEl.classList.add("input-invalid");
      inputEl.setAttribute("aria-invalid", "true");
    } else {
      inputEl.classList.remove("input-invalid");
      inputEl.removeAttribute("aria-invalid");
    }
  }

  function validateInputs() {
    const trimmedName = nameInput.value.trim();
    const rawAmount = amountInput.value.trim();
    const parsedAmount = Number(rawAmount);
    const selectedCategory = categorySelect.value;

    let isValid = true;

    if (!trimmedName) {
      setFieldError(nameInput, nameError, "Please enter an expense name.");
      isValid = false;
    } else {
      setFieldError(nameInput, nameError, "");
    }

    if (!rawAmount) {
      setFieldError(amountInput, amountError, "Please enter an amount.");
      isValid = false;
    } else if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setFieldError(amountInput, amountError, "Enter a positive amount greater than 0.");
      isValid = false;
    } else {
      setFieldError(amountInput, amountError, "");
    }

    if (!VALID_CATEGORIES.has(selectedCategory)) {
      setFieldError(categorySelect, categoryError, "Please choose a category.");
      isValid = false;
    } else {
      setFieldError(categorySelect, categoryError, "");
    }

    if (!isValid) {
      return null;
    }

    const roundedAmount = Math.round(parsedAmount * 100) / 100;
    if (roundedAmount <= 0) {
      setFieldError(amountInput, amountError, "Amount must be at least $0.01.");
      return null;
    }

    return {
      id: generateId(),
      name: trimmedName,
      amount: roundedAmount,
      category: selectedCategory,
    };
  }

  function calculateTotal(items) {
    const cents = items.reduce((sum, item) => sum + Math.round(item.amount * 100), 0);
    return cents / 100;
  }

  function createExpenseItemElement(expense) {
    const li = document.createElement("li");
    li.className = "expense-item";
    li.dataset.id = expense.id;

    const infoDiv = document.createElement("div");
    infoDiv.className = "expense-info";

    const nameSpan = document.createElement("span");
    nameSpan.className = "expense-name";
    nameSpan.textContent = expense.name;

    const categorySpan = document.createElement("span");
    categorySpan.className = `category-pill category-${expense.category.toLowerCase()}`;
    categorySpan.textContent = expense.category;

    infoDiv.append(nameSpan, categorySpan);

    const amountSpan = document.createElement("span");
    amountSpan.className = "expense-amount";
    amountSpan.textContent = currencyFormatter.format(expense.amount);

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "btn-delete";
    deleteBtn.textContent = "Delete";
    deleteBtn.setAttribute("aria-label", `Delete ${expense.name}`);
    deleteBtn.addEventListener("click", () => deleteExpense(expense.id));

    li.append(infoDiv, amountSpan, deleteBtn);
    return li;
  }

  function deleteExpense(id) {
    expenses = expenses.filter((expense) => expense.id !== id);
    saveExpenses();
    render();
  }

  function updateSummary(filteredExpenses, selectedCategory) {
    const overallTotal = calculateTotal(expenses);
    const filteredTotal = calculateTotal(filteredExpenses);
    const filteredCount = filteredExpenses.length;
    const itemWord = filteredCount === 1 ? "expense" : "expenses";

    if (selectedCategory === "All") {
      totalLabel.textContent = "Total Expenses";
      totalAmountEl.textContent = currencyFormatter.format(overallTotal);
      totalMetaEl.textContent = `${expenses.length} ${expenses.length === 1 ? "expense" : "expenses"} recorded`;
    } else {
      totalLabel.textContent = `${selectedCategory} Total`;
      totalAmountEl.textContent = currencyFormatter.format(filteredTotal);
      totalMetaEl.textContent = `${filteredCount} ${itemWord} in ${selectedCategory} • ${currencyFormatter.format(overallTotal)} overall`;
    }
  }

  function render() {
    const selectedCategory = categoryFilter.value;
    const filteredExpenses =
      selectedCategory === "All"
        ? expenses
        : expenses.filter((expense) => expense.category === selectedCategory);

    expenseList.replaceChildren();

    if (filteredExpenses.length === 0) {
      emptyState.hidden = false;
      if (expenses.length === 0) {
        emptyTitle.textContent = "No expenses recorded yet";
        emptySubtitle.textContent =
          "Add your first expense using the form to start tracking your spending.";
      } else {
        emptyTitle.textContent = `No ${selectedCategory} expenses found`;
        emptySubtitle.textContent =
          "Try selecting a different category or add a new expense above.";
      }
    } else {
      emptyState.hidden = true;
      const fragment = document.createDocumentFragment();
      for (const expense of filteredExpenses) {
        fragment.appendChild(createExpenseItemElement(expense));
      }
      expenseList.appendChild(fragment);
    }

    updateSummary(filteredExpenses, selectedCategory);
  }

  expenseForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const newExpense = validateInputs();
    if (!newExpense) {
      return;
    }

    expenses.unshift(newExpense);
    saveExpenses();
    expenseForm.reset();
    nameInput.focus();
    render();
  });

  nameInput.addEventListener("input", () => {
    if (nameInput.value.trim()) {
      setFieldError(nameInput, nameError, "");
    }
  });

  amountInput.addEventListener("input", () => {
    const val = Number(amountInput.value.trim());
    if (amountInput.value.trim() && Number.isFinite(val) && val > 0) {
      setFieldError(amountInput, amountError, "");
    }
  });

  categorySelect.addEventListener("change", () => {
    if (VALID_CATEGORIES.has(categorySelect.value)) {
      setFieldError(categorySelect, categoryError, "");
    }
  });

  categoryFilter.addEventListener("change", render);

  render();
})();
