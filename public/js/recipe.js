function deleteRecipe(recipeId) {
    if (confirm('Are you sure you want to delete this recipe? This action cannot be undone.')) {
        fetch(`/recipes/${recipeId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Show success message and redirect to dashboard
                alert('Recipe deleted successfully');
                window.location.href = '/dashboard';
            } else {
                alert(data.error || 'Error deleting recipe');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred while deleting the recipe');
        });
    }
} 