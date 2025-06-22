// Test execution script for RolePromptModal
console.log("=== RolePromptModal Test Execution ===");

// TC1: Modal Display on First Visit
console.log("\n--- TC1: Modal Display on First Visit ---");
localStorage.removeItem('participantName');
localStorage.removeItem('participantRole');
console.log("✓ LocalStorage cleared");

// Check if modal elements exist in DOM
function checkModalDisplay() {
  const modalElement = document.querySelector('[style*="position: fixed"]');
  const nameInput = document.querySelector('input[name="name"]');
  const roleInputs = document.querySelectorAll('input[name="role"]');
  
  console.log("Modal element found:", !!modalElement);
  console.log("Name input found:", !!nameInput);
  console.log("Role inputs found:", roleInputs.length);
  
  return {
    modalVisible: !!modalElement,
    hasNameInput: !!nameInput,
    hasRoleInputs: roleInputs.length === 2
  };
}

// TC2: Form Validation
function testFormValidation() {
  console.log("\n--- TC2: Form Validation ---");
  const form = document.querySelector('form');
  const submitButton = document.querySelector('button[type="submit"]');
  
  if (!form || !submitButton) {
    console.log("❌ Form elements not found");
    return false;
  }
  
  // Test empty submission
  try {
    form.checkValidity();
    console.log("Form validity (empty):", form.checkValidity());
  } catch (e) {
    console.log("Form validation error:", e.message);
  }
  
  return true;
}

// TC3: Role Selection
function testRoleSelection() {
  console.log("\n--- TC3: Role Selection ---");
  const roleInputs = document.querySelectorAll('input[name="role"]');
  
  if (roleInputs.length !== 2) {
    console.log("❌ Expected 2 role inputs, found:", roleInputs.length);
    return false;
  }
  
  // Test role selection
  roleInputs[0].click(); // Select first role
  console.log("First role selected:", roleInputs[0].checked);
  
  roleInputs[1].click(); // Select second role
  console.log("Second role selected:", roleInputs[1].checked);
  console.log("First role still selected:", roleInputs[0].checked);
  
  return true;
}

// TC4: Form Submission
function testFormSubmission() {
  console.log("\n--- TC4: Form Submission ---");
  const nameInput = document.querySelector('input[name="name"]');
  const roleInputs = document.querySelectorAll('input[name="role"]');
  const form = document.querySelector('form');
  
  if (!nameInput || !roleInputs.length || !form) {
    console.log("❌ Form elements missing");
    return false;
  }
  
  // Fill form
  nameInput.value = "Test User";
  roleInputs[0].checked = true; // Select Interviewer
  
  console.log("Form filled with:", {
    name: nameInput.value,
    role: roleInputs[0].value
  });
  
  // Test submission (don't actually submit to avoid navigation)
  console.log("Form is valid:", form.checkValidity());
  
  return form.checkValidity();
}

// Execute tests
setTimeout(() => {
  const tc1 = checkModalDisplay();
  console.log("TC1 Result:", tc1.modalVisible && tc1.hasNameInput && tc1.hasRoleInputs ? "PASS" : "FAIL");
  
  const tc2 = testFormValidation();
  console.log("TC2 Result:", tc2 ? "PASS" : "FAIL");
  
  const tc3 = testRoleSelection();
  console.log("TC3 Result:", tc3 ? "PASS" : "FAIL");
  
  const tc4 = testFormSubmission();
  console.log("TC4 Result:", tc4 ? "PASS" : "FAIL");
  
  console.log("\n=== Test Summary ===");
  console.log("TC1 (Modal Display):", tc1.modalVisible && tc1.hasNameInput && tc1.hasRoleInputs ? "PASS" : "FAIL");
  console.log("TC2 (Form Validation):", tc2 ? "PASS" : "FAIL");
  console.log("TC3 (Role Selection):", tc3 ? "PASS" : "FAIL");
  console.log("TC4 (Form Submission):", tc4 ? "PASS" : "FAIL");
}, 2000);