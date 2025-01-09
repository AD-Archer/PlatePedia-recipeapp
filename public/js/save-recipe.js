async function toggleSaveRecipe(recipeId, button) {
    const isSaved = button.getAttribute('data-saved') === 'true';
    try {
        const response = await fetch(`/recipes/${recipeId}/save`, {
            method: isSaved ? 'DELETE' : 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            button.setAttribute('data-saved', !isSaved);
            const icon = button.querySelector('i');
            icon.className = `bi bi-bookmark${!isSaved ? '-fill' : ''}`;
        } else {
            alert(data.error || 'Error updating save status');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error updating save status');
    }
} 