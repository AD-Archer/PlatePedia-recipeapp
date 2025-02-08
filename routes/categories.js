router.get('/categories', async (req, res) => {
  try {
    const categories = await Category.aggregate([
      {
        $lookup: {
          from: 'recipes',
          localField: '_id',
          foreignField: 'categories',
          as: 'recipes'
        }
      },
      {
        $addFields: {
          randomRecipe: {
            $arrayElemAt: [
              '$recipes',
              { $floor: { $multiply: [{ $rand: {} }, { $size: '$recipes' }] } }
            ]
          }
        }
      },
      {
        $project: {
          name: 1,
          description: 1,
          imageUrl: { $ifNull: ['$randomRecipe.imageUrl', '$defaultImageUrl'] }
        }
      }
    ]);
    
    res.render('categories', { categories });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
}); 