const handleHRStatusChange = async (candidateId, newHRStatus) => {
    try {
      // First, update the HR status
      await axios.put("/api/recruitment/updateHRStatus", {
        candidateId,
        hrStatus: newHRStatus,
      });
  
      // Then, only if status is "Selected", generate the form link
      if (newHRStatus === "Selected") {
        await axios.post("/api/recruitment/generateFormLink", {
          candidateId,
        });
      }
  
      // Refresh the list
      fetchCandidates();
    } catch (error) {
      console.error("Error updating HR status or generating form link:", error);
    }
  };
  