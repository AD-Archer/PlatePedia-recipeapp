async function toggleFollow(userId, button) {
    try {
        console.log('Raw userId:', userId);
        console.log('Attempting to follow user:', userId);
        const isFollowing = button.getAttribute('data-following') === 'true';
        const method = isFollowing ? 'DELETE' : 'POST';
        
        const url = `/users/${userId}/follow`;
        console.log('Making request to:', url);

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Response data:', data);
        
        if (response.ok && data.success) {
            button.setAttribute('data-following', !isFollowing);
            button.innerHTML = isFollowing ? 
                '<i class="bi bi-person-plus"></i> Follow' : 
                '<i class="bi bi-person-check"></i> Following';
            button.classList.toggle('btn-primary');
            button.classList.toggle('btn-secondary');
        } else {
            console.error('Error toggling follow:', data.error || 'Unknown error');
            alert(data.error || 'Error toggling follow status');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error toggling follow status');
    }
} 