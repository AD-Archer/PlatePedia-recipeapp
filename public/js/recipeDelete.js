function deleteRecipe(recipeId, redirectUrl) {
    if (confirm('Are you sure you want to delete this recipe?')) {
        fetch(`/recipes/${recipeId}`, {
            method: 'DELETE',
        })
        .then(response => {
            if (response.ok) {
                return response.json(); // Parse JSON response
            } else {
                alert('Error deleting recipe');
            }
        })
        .then(data => {
            if (data && data.redirectUrl) {
                window.location.href = data.redirectUrl; // Redirect to the specified URL
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error deleting recipe');
        });
    }
}
