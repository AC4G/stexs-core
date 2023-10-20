<script>
  import { stexsClient } from "../stexsClient";
  let mfaCode = "";

  const handleSignIn = async () => {
    try {
      const response = await stexsClient.auth.signIn("AC4G", "Test12345.");
      console.log("Sign In Response:", response);
    } catch (error) {
      console.error("Sign In Error:", error);
    }
  };

  const handleSignInConfirm = async () => {
    try {
      if (mfaCode.trim() === "") {
        console.error("MFA code is required.");
        return;
      }

      const response = await stexsClient.auth.signInConfirm("email", mfaCode); // Replace "email" with the actual type you want to use
      console.log("Sign In Confirm Response:", response);
    } catch (error) {
      console.error("Sign In Confirm Error:", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await stexsClient.auth.signOut();
      console.log("Sign Out Successful");
    } catch (error) {
      console.error("Sign Out Error:", error);
    }
  };

  const getLocalStorageData = () => {
    if (typeof window !== "undefined") {
      const localStorageData = localStorage.getItem("yourLocalStorageKey");
      return localStorageData ? JSON.parse(localStorageData) : null;
    }
    return null;
  };

  const localStorageData = getLocalStorageData();
</script>

<section>
  <h1>Welcome</h1>

  {#if localStorageData}
    <p>Local Storage Data:</p>
    <pre>{JSON.stringify(localStorageData, null, 2)}</pre>
  {/if}

  <input type="text" bind:value={mfaCode} placeholder="Enter MFA Code" />

  <!-- Sign In and Confirm Sign In buttons -->
  <button on:click={handleSignIn}>Sign In</button>
  <button on:click={handleSignInConfirm}>Confirm Sign In</button>
  <button on:click={handleSignOut}>Sign Out</button>
</section>
